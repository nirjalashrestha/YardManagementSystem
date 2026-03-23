using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.WebUtilities;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using YardManagementSystem.DTOs;
using YardManagementSystem.Models;
using YardManagementSystem.Security;
using YardManagementSystem.Services;

namespace YardManagementSystem.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AuthController : ControllerBase
    {
        private readonly UserManager<ApplicationUsers> _userManager;
        private readonly RoleManager<IdentityRole> _roleManager;
        private readonly IConfiguration _config;
        private readonly EmailSender _emailSender;

        public AuthController(
            UserManager<ApplicationUsers> userManager,
            RoleManager<IdentityRole> roleManager,
            IConfiguration config,
            EmailSender emailSender)
        {
            _userManager = userManager;
            _roleManager = roleManager;
            _config = config;
            _emailSender = emailSender;
        }

        // ---------------- REGISTER ----------------
        [HttpPost("register")]
        public async Task<IActionResult> Register(RegisterDto dto)
        {
            var firstName = (dto.FirstName ?? "").Trim();
            var lastName = (dto.LastName ?? "").Trim();
            var fullName = $"{firstName} {lastName}".Trim();
            var email = (dto.Email ?? "").Trim();
            var phoneNumber = (dto.PhoneNumber ?? "").Trim();

            if (string.IsNullOrWhiteSpace(firstName) || string.IsNullOrWhiteSpace(lastName))
                return BadRequest("First name and last name are required.");

            if (string.IsNullOrWhiteSpace(email))
                return BadRequest("Email is required.");

            if (string.IsNullOrWhiteSpace(phoneNumber))
                return BadRequest("Phone number is required.");

            if (string.IsNullOrWhiteSpace(dto.Password))
                return BadRequest("Password is required.");

            if (dto.Password != dto.ConfirmPassword)
                return BadRequest("Passwords do not match.");

            var existing = await _userManager.FindByEmailAsync(email);
            if (existing != null) return BadRequest("Email already exists.");

            var forcedRoleKey = RbacRoles.VIEW_ONLY;
            await EnsureRoleExists(forcedRoleKey);

            var publicId = PublicIdGenerator.Generate("View Only");
            var user = new ApplicationUsers
            {
                PublicId = publicId,
                FullName = fullName,
                Email = email,
                UserName = email,
                PhoneNumber = phoneNumber, // Identity phone field
                AppRole = "View Only",
                Status = "Active",
                EmailConfirmed = false,
                IsEmailVerified = false
            };

            var create = await _userManager.CreateAsync(user, dto.Password);
            if (!create.Succeeded) return BadRequest(create.Errors);

            await _userManager.AddToRoleAsync(user, forcedRoleKey);

            await SendOtpInternal(user);

            return Ok(new
            {
                message = "Registered successfully. OTP sent to email.",
                email = user.Email
            });
        }

        // ---------------- SEND OTP ----------------
        [HttpPost("send-otp")]
        public async Task<IActionResult> SendOtp([FromBody] VerifyEmailDto dto)
        {
            var email = (dto.Email ?? "").Trim();

            var user = await _userManager.FindByEmailAsync(email);
            if (user == null) return BadRequest("No account found with this email.");

            if (user.EmailConfirmed || user.IsEmailVerified)
                return Ok(new { message = "Email already verified." });

            await SendOtpInternal(user);
            return Ok(new { message = "OTP sent. Check your email." });
        }

        // ---------------- CONFIRM OTP ----------------
        [HttpPost("confirm-otp")]
        public async Task<IActionResult> ConfirmOtp([FromBody] ConfirmEmailDto dto)
        {
            var email = (dto.Email ?? "").Trim();

            var user = await _userManager.FindByEmailAsync(email);
            if (user == null) return BadRequest("Invalid email.");

            if (string.IsNullOrWhiteSpace(user.EmailOtp) || user.EmailOtpExpiry == null)
                return BadRequest("OTP not found. Please request again.");

            if (DateTime.UtcNow > user.EmailOtpExpiry.Value)
                return BadRequest("OTP expired. Please request again.");

            if (user.EmailOtp != dto.Code)
                return BadRequest("Invalid OTP.");

            user.IsEmailVerified = true;
            user.EmailConfirmed = true;
            user.EmailOtp = null;
            user.EmailOtpExpiry = null;

            await _userManager.UpdateAsync(user);

            return Ok(new { message = "Email verified successfully. You can login now." });
        }

        // ---------------- LOGIN ----------------
        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] LoginDto dto)
        {
            var email = (dto.Email ?? "").Trim();

            var user = await _userManager.FindByEmailAsync(email);
            if (user == null) return Unauthorized("Invalid email or password.");

            if (string.Equals(user.Status, "Inactive", StringComparison.OrdinalIgnoreCase))
                return Unauthorized("Your account is inactive. Contact admin.");

            if (!user.EmailConfirmed || !user.IsEmailVerified)
                return Unauthorized("Please verify your email first.");

            var passOk = await _userManager.CheckPasswordAsync(user, dto.Password);
            if (!passOk) return Unauthorized("Invalid email or password.");

            var roles = await _userManager.GetRolesAsync(user);
            var roleKey = roles.FirstOrDefault() ?? RbacRoles.VIEW_ONLY;

            var roleDisplay = RoleKeyToDisplay(roleKey);
            var roleCode = RoleKeyToCode(roleKey);

            user.AppRole = roleDisplay;
            await _userManager.UpdateAsync(user);

            var token = CreateJwtToken(user, roleKey, roleDisplay, roleCode);

            return Ok(new
            {
                token,
                roleKey,
                roleCode,
                role = roleDisplay,
                status = user.Status,
                email = user.Email,
                fullName = user.FullName,
                publicId = user.PublicId
            });
        }

        // ---------------- FORGOT PASSWORD ----------------
        [HttpPost("forgot-password")]
        public async Task<IActionResult> ForgotPassword([FromBody] VerifyEmailDto dto)
        {
            var email = (dto.Email ?? "").Trim();

            var user = await _userManager.FindByEmailAsync(email);
            if (user == null) return Ok(new { message = "If email exists, reset link sent." });

            var token = await _userManager.GeneratePasswordResetTokenAsync(user);
            var tokenBytes = Encoding.UTF8.GetBytes(token);
            var safeToken = WebEncoders.Base64UrlEncode(tokenBytes);

            var link = $"http://localhost:3000/reset-password?email={email}&token={safeToken}";
            await _emailSender.SendEmailAsync(email, "Reset Password", $"Click: {link}");

            return Ok(new { message = "Reset link sent to your email." });
        }

        [HttpPost("reset-password")]
        public async Task<IActionResult> ResetPassword([FromBody] ResetPasswordDto dto)
        {
            if (dto.NewPassword != dto.ConfirmPassword)
                return BadRequest(new { message = "Passwords do not match." });

            var email = (dto.Email ?? "").Trim();
            var user = await _userManager.FindByEmailAsync(email);
            if (user == null) return BadRequest(new { message = "Invalid request." });

            try
            {
                var tokenBytes = WebEncoders.Base64UrlDecode(dto.Token);
                var decodedToken = Encoding.UTF8.GetString(tokenBytes);

                var result = await _userManager.ResetPasswordAsync(user, decodedToken, dto.NewPassword);
                if (!result.Succeeded)
                    return BadRequest(new
                    {
                        message = result.Errors.FirstOrDefault()?.Description ?? "Reset failed."
                    });

                return Ok(new { message = "Password reset successful. Please login." });
            }
            catch
            {
                return BadRequest(new { message = "Invalid token." });
            }
        }

        // ---------------- CHANGE PASSWORD (logged-in) ----------------
        [Authorize]
        [HttpPost("change-password")]
        public async Task<IActionResult> ChangePassword([FromBody] ChangePasswordSelfDto dto)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);

            if (dto.NewPassword != dto.ConfirmPassword)
                return BadRequest(new { message = "Passwords do not match." });

            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrWhiteSpace(userId)) return Unauthorized();

            var user = await _userManager.FindByIdAsync(userId);
            if (user == null) return NotFound("User not found.");

            var token = await _userManager.GeneratePasswordResetTokenAsync(user);
            var result = await _userManager.ResetPasswordAsync(user, token, dto.NewPassword);
            if (!result.Succeeded)
                return BadRequest(new
                {
                    message = result.Errors.FirstOrDefault()?.Description ?? "Password change failed."
                });

            return Ok(new { message = "Password updated." });
        }

        [HttpGet("debug-user")]
        public async Task<IActionResult> DebugUser(string email)
        {
            var user = await _userManager.FindByEmailAsync(email.Trim());
            if (user == null) return NotFound("User not found");

            var roles = await _userManager.GetRolesAsync(user);

            return Ok(new
            {
                user.Email,
                user.EmailConfirmed,
                user.IsEmailVerified,
                roles
            });
        }

        // ---------------- INTERNAL OTP ----------------
        private async Task SendOtpInternal(ApplicationUsers user)
        {
            var code = Random.Shared.Next(100000, 999999).ToString();

            user.EmailOtp = code;
            user.EmailOtpExpiry = DateTime.UtcNow.AddMinutes(5);
            await _userManager.UpdateAsync(user);

            await _emailSender.SendEmailAsync(
                user.Email!,
                "YMS Email Verification Code",
                $"Your OTP is: {code}"
            );
        }

        // ---------------- JWT ----------------
        private string CreateJwtToken(ApplicationUsers user, string roleKey, string roleDisplay, string roleCode)
        {
            var claims = new List<Claim>
            {
                new Claim(ClaimTypes.NameIdentifier, user.Id),
                new Claim(ClaimTypes.Email, user.Email ?? ""),
                new Claim(ClaimTypes.Role, roleKey),
                new Claim("role", roleKey),
                new Claim("roleDisplay", roleDisplay),
                new Claim("roleCode", roleCode),
                new Claim("fullName", user.FullName ?? ""),
                new Claim("publicId", user.PublicId ?? "")
            };

            var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_config["Jwt:Key"]!));
            var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

            var jwt = new JwtSecurityToken(
                issuer: _config["Jwt:Issuer"],
                audience: _config["Jwt:Audience"],
                claims: claims,
                expires: DateTime.UtcNow.AddHours(3),
                signingCredentials: creds
            );

            return new JwtSecurityTokenHandler().WriteToken(jwt);
        }

        // ---------------- HELPERS ----------------
        private async Task EnsureRoleExists(string roleKey)
        {
            if (!await _roleManager.RoleExistsAsync(roleKey))
                await _roleManager.CreateAsync(new IdentityRole(roleKey));
        }

        private static string RoleKeyToDisplay(string roleKey) => roleKey switch
        {
            "GateSecurity" => "Gate Security",
            "YardManager" => "Yard Manager",
            "YardJockey" => "Yard Jockey",
            "ViewOnly" => "View Only",
            _ => roleKey
        };

        private static string RoleKeyToCode(string roleKey) => roleKey switch
        {
            "Admin" => "ADMIN",
            "YardManager" => "YARD_MANAGER",
            "YardJockey" => "YARD_JOCKEY",
            "GateSecurity" => "GATE_SECURITY",
            "Driver" => "DRIVER",
            _ => "VIEW_ONLY"
        };
    }
}
