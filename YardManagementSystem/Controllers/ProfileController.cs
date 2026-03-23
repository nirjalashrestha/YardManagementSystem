using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using YardManagementSystem.DTOs;
using YardManagementSystem.Models;

namespace YardManagementSystem.Controllers
{
    [ApiController]
    [Route("api/profile")]
    [Authorize]
    public class ProfileController : ControllerBase
    {
        private readonly UserManager<ApplicationUsers> _userManager;
        private readonly IWebHostEnvironment _env;

        private static readonly HashSet<string> AllowedExt = new(StringComparer.OrdinalIgnoreCase)
        {
            ".jpg", ".jpeg", ".png", ".webp"
        };

        private const long MaxPhotoBytes = 5 * 1024 * 1024; // 5 MB

        public ProfileController(UserManager<ApplicationUsers> userManager, IWebHostEnvironment env)
        {
            _userManager = userManager;
            _env = env;
        }

        // GET /api/profile/me
        [HttpGet("me")]
        public async Task<ActionResult<ProfileMeDto>> Me()
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrWhiteSpace(userId)) return Unauthorized();

            var u = await _userManager.FindByIdAsync(userId);
            if (u == null) return NotFound("User not found.");

            var roles = await _userManager.GetRolesAsync(u);
            var identityRole = roles.FirstOrDefault() ?? "";
            var uiRole = !string.IsNullOrWhiteSpace(u.AppRole)
                ? u.AppRole
                : MapIdentityRoleToUiRole(identityRole);

            var photo = !string.IsNullOrWhiteSpace(u.ProfileImageUrl) ? u.ProfileImageUrl : u.PhotoUrl;

            return Ok(new ProfileMeDto
            {
                Id = u.Id,
                PublicId = u.PublicId,
                FullName = u.FullName ?? "",
                Email = u.Email ?? "",
                Role = uiRole,
                PhoneNumber = u.PhoneNumber2 ?? "",
                Address = u.Address ?? "",
                ProfileImageUrl = photo ?? "",
                ThemePreference = string.IsNullOrWhiteSpace(u.ThemePreference) ? "dark" : u.ThemePreference,
                NotifyArrivals = u.NotifyArrivals,
                NotifyDepartures = u.NotifyDepartures,
                NotifyEmail = u.NotifyEmail,
                NotifySms = u.NotifySms
            });
        }

        // PUT /api/profile/me
        [HttpPut("me")]
        public async Task<IActionResult> UpdateMe([FromBody] UpdateProfileDto dto)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);

            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrWhiteSpace(userId)) return Unauthorized();

            var u = await _userManager.FindByIdAsync(userId);
            if (u == null) return NotFound("User not found.");

            var newEmail = (dto.Email ?? "").Trim();
            var newFullName = (dto.FullName ?? "").Trim();

            if (string.IsNullOrWhiteSpace(newEmail))
                return BadRequest("Email is required.");

            if (string.IsNullOrWhiteSpace(newFullName))
                return BadRequest("Full name is required.");

            if (!string.Equals(u.Email, newEmail, StringComparison.OrdinalIgnoreCase))
            {
                var exists = await _userManager.FindByEmailAsync(newEmail);
                if (exists != null && exists.Id != u.Id)
                    return BadRequest("Email already exists.");

                u.Email = newEmail;
                u.UserName = newEmail; // keep UserName aligned with email
            }

            u.FullName = newFullName;
            u.PhoneNumber2 = dto.PhoneNumber?.Trim() ?? "";
            u.PhoneNumber = u.PhoneNumber2;
            u.Address = dto.Address?.Trim() ?? "";

            var res = await _userManager.UpdateAsync(u);
            if (!res.Succeeded)
                return BadRequest(res.Errors.Select(e => e.Description));

            return Ok(new { message = "Profile updated" });
        }

        // POST /api/profile/me/photo
        [HttpPost("me/photo")]
        [Consumes("multipart/form-data")]
        public async Task<IActionResult> UploadPhoto(IFormFile file)
        {
            if (file == null || file.Length == 0)
                return BadRequest("No file uploaded.");

            if (file.Length > MaxPhotoBytes)
                return BadRequest("File size must be <= 5 MB.");

            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrWhiteSpace(userId)) return Unauthorized();

            var u = await _userManager.FindByIdAsync(userId);
            if (u == null) return NotFound("User not found.");

            var ext = Path.GetExtension(file.FileName);
            if (string.IsNullOrWhiteSpace(ext) || !AllowedExt.Contains(ext))
                return BadRequest("Only jpg, jpeg, png, webp allowed.");

            var webRoot = _env.WebRootPath ?? Path.Combine(_env.ContentRootPath, "wwwroot");
            var uploadsDir = Path.Combine(webRoot, "uploads", "profiles");
            Directory.CreateDirectory(uploadsDir);

            var publicId = string.IsNullOrWhiteSpace(u.PublicId) ? u.Id : u.PublicId;
            var safeName = $"{publicId}_{Guid.NewGuid():N}{ext.ToLowerInvariant()}";
            var fullPath = Path.Combine(uploadsDir, safeName);

            await using (var stream = new FileStream(fullPath, FileMode.Create))
            {
                await file.CopyToAsync(stream);
            }

            u.ProfileImageUrl = $"/uploads/profiles/{safeName}";
            u.PhotoUrl = u.ProfileImageUrl;

            var updateRes = await _userManager.UpdateAsync(u);
            if (!updateRes.Succeeded)
                return BadRequest(updateRes.Errors.Select(e => e.Description));

            return Ok(new { profileImageUrl = u.ProfileImageUrl });
        }

        private static string MapIdentityRoleToUiRole(string identityRole)
        {
            if (string.IsNullOrWhiteSpace(identityRole)) return "View Only";

            var r = identityRole.Trim();
            if (string.Equals(r, "ViewOnly", StringComparison.OrdinalIgnoreCase)) return "View Only";
            if (string.Equals(r, "GateSecurity", StringComparison.OrdinalIgnoreCase)) return "Gate Security";
            if (string.Equals(r, "YardManager", StringComparison.OrdinalIgnoreCase)) return "Yard Manager";
            if (string.Equals(r, "YardJockey", StringComparison.OrdinalIgnoreCase)) return "Yard Jockey";
            if (string.Equals(r, "Driver", StringComparison.OrdinalIgnoreCase)) return "Driver";
            if (string.Equals(r, "Admin", StringComparison.OrdinalIgnoreCase)) return "Admin";
            return r;
        }
    }
}
