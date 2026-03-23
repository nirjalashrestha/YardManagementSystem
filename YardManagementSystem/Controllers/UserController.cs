using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using YardManagementSystem.DTOs;
using YardManagementSystem.Models;
using YardManagementSystem.Security;

namespace YardManagementSystem.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class UsersController : ControllerBase
    {
        private readonly UserManager<ApplicationUsers> _userManager;
        private readonly RoleManager<IdentityRole> _roleManager;

        public UsersController(UserManager<ApplicationUsers> userManager, RoleManager<IdentityRole> roleManager)
        {
            _userManager = userManager;
            _roleManager = roleManager;
        }

        // ✅ GET: api/Users
        [HttpGet]
        [Authorize(Roles = RbacRoles.READ_ACCESS)]
        public async Task<IActionResult> GetAll()
        {
            var list = await _userManager.Users
                .OrderByDescending(x => x.CreatedAtUtc)
                .ToListAsync();

            var result = new List<object>();

            foreach (var u in list)
            {
                var roles = await _userManager.GetRolesAsync(u);
                var identityRole = roles.FirstOrDefault() ?? "";

                var uiRole = !string.IsNullOrWhiteSpace(u.AppRole)
                    ? u.AppRole
                    : MapIdentityRoleToUiRole(identityRole);

                var photo = !string.IsNullOrWhiteSpace(u.ProfileImageUrl) ? u.ProfileImageUrl : u.PhotoUrl;

                result.Add(new
                {
                    u.Id,
                    UserId = u.PublicId,
                    u.FullName,
                    u.Email,
                    CountryCode = u.CountryCode,
                    PhoneNumber = u.PhoneNumber2,
                    u.Address,
                    Role = uiRole,
                    RoleKey = string.IsNullOrWhiteSpace(identityRole) ? RbacRoles.VIEW_ONLY : identityRole,
                    Status = u.Status,
                    u.LicenseNumber,
                    PhotoUrl = photo,
                    ProfileImageUrl = photo
                });
            }

            return Ok(result);
        }

        // ✅ GET: api/Users/drivers?search=&skip=0&take=200
        [HttpGet("drivers")]
        [Authorize(Roles = RbacRoles.OPERATIONAL)]
        public async Task<IActionResult> GetDrivers(
            [FromQuery] string? search = "",
            [FromQuery] int skip = 0,
            [FromQuery] int take = 200)
        {
            if (take < 1) take = 50;
            if (take > 500) take = 500;

            search = (search ?? "").Trim();

            var baseQ = _userManager.Users.AsNoTracking().AsQueryable();

            if (!string.IsNullOrWhiteSpace(search))
            {
                baseQ = baseQ.Where(u =>
                    (u.PublicId ?? "").Contains(search) ||
                    (u.FullName ?? "").Contains(search) ||
                    (u.Email ?? "").Contains(search));
            }

            var chunk = await baseQ
                .OrderByDescending(u => u.CreatedAtUtc)
                .Skip(skip)
                .Take(take)
                .ToListAsync();

            var items = new List<object>();

            foreach (var u in chunk)
            {
                var roles = await _userManager.GetRolesAsync(u);

                var appRole = (u.AppRole ?? "").Trim();
                var isDriver =
                    string.Equals(appRole, "Driver", StringComparison.OrdinalIgnoreCase) ||
                    roles.Any(r => string.Equals(r, RbacRoles.DRIVER, StringComparison.OrdinalIgnoreCase));

                if (!isDriver) continue;

                items.Add(new
                {
                    id = u.Id,
                    userId = u.PublicId,
                    fullName = u.FullName,
                    licenseNumber = u.LicenseNumber,
                    phoneNumber = u.PhoneNumber2,
                    status = u.Status
                });
            }

            var total = await _userManager.Users.AsNoTracking()
                .CountAsync(u => (u.AppRole ?? "").Trim().ToLower() == "driver");

            return Ok(new
            {
                total,
                shown = Math.Min(skip + items.Count, total),
                items
            });
        }

        // ✅ POST: api/Users
        [HttpPost]
        [Authorize(Roles = RbacRoles.ADMIN)]
        public async Task<IActionResult> Create([FromBody] UserUpsertDto dto)
        {
            var email = dto.Email?.Trim() ?? "";
            var existsEmail = await _userManager.FindByEmailAsync(email);
            if (existsEmail != null) return BadRequest("Email already exists.");

            var uiRole = dto.Role?.Trim() ?? "View Only";
            var identityRole = ToIdentityRole(uiRole);

            await EnsureRole(identityRole);

            var publicId = YardManagementSystem.Services.PublicIdGenerator.Generate(uiRole);

            var user = new ApplicationUsers
            {
                PublicId = publicId,
                UserName = publicId,
                FullName = dto.FullName?.Trim() ?? "",
                Email = email,
                EmailConfirmed = true,
                IsEmailVerified = true,

                CountryCode = (dto.CountryCode ?? "+977").Trim(),
                PhoneNumber2 = dto.PhoneNumber?.Trim() ?? "",
                PhoneNumber = dto.PhoneNumber?.Trim() ?? "",
                Address = dto.Address?.Trim() ?? "",

                Status = dto.Status ?? "Active",
                AppRole = uiRole,
                LicenseNumber = uiRole.Equals("Driver", StringComparison.OrdinalIgnoreCase) ? dto.LicenseNumber?.Trim() : null,
                PhotoUrl = dto.PhotoUrl,
                ProfileImageUrl = dto.PhotoUrl
            };

            if (string.IsNullOrWhiteSpace(dto.Password) || dto.Password.Length < 6)
                return BadRequest("Password is required (min 6 chars).");

            var result = await _userManager.CreateAsync(user, dto.Password);
            if (!result.Succeeded) return BadRequest(result.Errors);

            await _userManager.AddToRoleAsync(user, identityRole);

            return Ok(new
            {
                message = "User created",
                id = user.Id,
                userId = user.PublicId,
                role = user.AppRole,
                roleKey = identityRole
            });
        }

        // ✅ PUT: api/Users/{id}
        [HttpPut("{id}")]
        [Authorize(Roles = RbacRoles.ADMIN)]
        public async Task<IActionResult> Update(string id, [FromBody] UserUpsertDto dto)
        {
            var user = await _userManager.FindByIdAsync(id);
            if (user == null) return NotFound("User not found.");

            var newEmail = dto.Email?.Trim() ?? "";
            if (!string.IsNullOrWhiteSpace(newEmail) &&
                !string.Equals(user.Email, newEmail, StringComparison.OrdinalIgnoreCase))
            {
                var exists = await _userManager.FindByEmailAsync(newEmail);
                if (exists != null) return BadRequest("Email already exists.");

                user.Email = newEmail;
            }

            user.FullName = dto.FullName?.Trim() ?? user.FullName;
            user.CountryCode = string.IsNullOrWhiteSpace(dto.CountryCode) ? user.CountryCode : dto.CountryCode.Trim();
            user.PhoneNumber2 = dto.PhoneNumber?.Trim() ?? user.PhoneNumber2;
            user.PhoneNumber = user.PhoneNumber2;
            user.Address = dto.Address?.Trim() ?? user.Address;
            user.Status = dto.Status ?? user.Status;

            var uiRole = dto.Role?.Trim() ?? user.AppRole ?? "View Only";
            user.AppRole = uiRole;
            user.LicenseNumber = uiRole.Equals("Driver", StringComparison.OrdinalIgnoreCase) ? dto.LicenseNumber?.Trim() : null;

            if (!string.IsNullOrWhiteSpace(dto.PhotoUrl))
            {
                user.PhotoUrl = dto.PhotoUrl;
                user.ProfileImageUrl = dto.PhotoUrl;
            }

            var identityRole = ToIdentityRole(uiRole);
            await EnsureRole(identityRole);

            var currentRoles = await _userManager.GetRolesAsync(user);
            if (currentRoles.Any())
                await _userManager.RemoveFromRolesAsync(user, currentRoles);

            await _userManager.AddToRoleAsync(user, identityRole);

            if (!string.IsNullOrWhiteSpace(dto.Password))
            {
                if (dto.Password.Length < 6) return BadRequest("Password must be at least 6 chars.");

                var token = await _userManager.GeneratePasswordResetTokenAsync(user);
                var passRes = await _userManager.ResetPasswordAsync(user, token, dto.Password);
                if (!passRes.Succeeded) return BadRequest(passRes.Errors);
            }

            var res = await _userManager.UpdateAsync(user);
            if (!res.Succeeded) return BadRequest(res.Errors);

            return Ok(new
            {
                message = "Updated",
                id = user.Id,
                userId = user.PublicId,
                role = user.AppRole,
                roleKey = identityRole
            });
        }

        // ✅ DELETE: api/Users/{id}
        [HttpDelete("{id}")]
        [Authorize(Roles = RbacRoles.ADMIN)]
        public async Task<IActionResult> Delete(string id)
        {
            var user = await _userManager.FindByIdAsync(id);
            if (user == null) return NotFound("User not found.");

            var res = await _userManager.DeleteAsync(user);
            if (!res.Succeeded) return BadRequest(res.Errors);

            return Ok(new { message = "Deleted" });
        }

        // ✅ POST: api/Users/fix-legacy
        [HttpPost("fix-legacy")]
        [Authorize(Roles = RbacRoles.ADMIN)]
        public async Task<IActionResult> FixLegacyUsers()
        {
            var list = await _userManager.Users.ToListAsync();

            foreach (var u in list)
            {
                if (string.IsNullOrWhiteSpace(u.PublicId))
                {
                    u.PublicId = GenerateLegacyPublicId();
                    u.UserName = u.PublicId;
                }

                if (string.IsNullOrWhiteSpace(u.AppRole))
                {
                    var roles = await _userManager.GetRolesAsync(u);
                    var identityRole = roles.FirstOrDefault();

                    u.AppRole = !string.IsNullOrWhiteSpace(identityRole)
                        ? ToUiRole(identityRole)
                        : "View Only";
                }

                await _userManager.UpdateAsync(u);
            }

            return Ok(new { message = "Legacy users fixed", count = list.Count });
        }

        // ✅ POST: api/Users/{userId}/photo
        [HttpPost("{userId}/photo")]
        [Authorize(Roles = RbacRoles.ADMIN)]
        public async Task<IActionResult> UploadPhoto(string userId, IFormFile file)
        {
            if (file == null || file.Length == 0)
                return BadRequest("No file uploaded.");

            var user = await _userManager.Users.FirstOrDefaultAsync(u =>
                u.Id == userId || u.PublicId == userId);

            if (user == null)
                return NotFound("User not found.");

            var allowed = new[] { ".jpg", ".jpeg", ".png", ".webp" };
            var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
            if (!allowed.Contains(ext))
                return BadRequest("Only jpg, jpeg, png, webp allowed.");

            var uploadsDir = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "uploads", "users");
            if (!Directory.Exists(uploadsDir))
                Directory.CreateDirectory(uploadsDir);

            var safeName = $"{user.PublicId}_{Guid.NewGuid():N}{ext}";
            var fullPath = Path.Combine(uploadsDir, safeName);

            using (var stream = new FileStream(fullPath, FileMode.Create))
            {
                await file.CopyToAsync(stream);
            }

            user.PhotoUrl = $"/uploads/users/{safeName}";
            user.ProfileImageUrl = user.PhotoUrl;
            await _userManager.UpdateAsync(user);

            return Ok(new { photoUrl = user.PhotoUrl });
        }

        // ✅ DELETE: api/Users/{userId}/photo
        [HttpDelete("{userId}/photo")]
        [Authorize(Roles = RbacRoles.ADMIN)]
        public async Task<IActionResult> DeletePhoto(string userId)
        {
            var user = await _userManager.Users.FirstOrDefaultAsync(u =>
                u.Id == userId || u.PublicId == userId);

            if (user == null) return NotFound("User not found.");

            if (!string.IsNullOrWhiteSpace(user.PhotoUrl))
            {
                var relative = user.PhotoUrl.TrimStart('/');
                var fullPath = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", relative);

                if (System.IO.File.Exists(fullPath))
                    System.IO.File.Delete(fullPath);

                user.PhotoUrl = null;
                user.ProfileImageUrl = null;
                await _userManager.UpdateAsync(user);
            }

            return Ok(new { message = "Photo deleted" });
        }

        // ✅ GET: api/Users/me
        [HttpGet("me")]
        [Authorize]
        public async Task<IActionResult> Me()
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrWhiteSpace(userId))
                return Unauthorized();

            var u = await _userManager.FindByIdAsync(userId);
            if (u == null) return NotFound("User not found.");

            var roles = await _userManager.GetRolesAsync(u);
            var identityRole = roles.FirstOrDefault() ?? RbacRoles.VIEW_ONLY;
            var uiRole = !string.IsNullOrWhiteSpace(u.AppRole) ? u.AppRole : MapIdentityRoleToUiRole(identityRole);

            return Ok(new
            {
                id = u.Id,
                userId = u.PublicId,
                fullName = u.FullName,
                email = u.Email,
                countryCode = u.CountryCode,
                phoneNumber = u.PhoneNumber2,
                address = u.Address,
                role = uiRole,
                roleKey = identityRole,
                roleCode = RoleKeyToCode(identityRole),
                status = u.Status,
                licenseNumber = u.LicenseNumber,
                photoUrl = !string.IsNullOrWhiteSpace(u.ProfileImageUrl) ? u.ProfileImageUrl : u.PhotoUrl,
                profileImageUrl = !string.IsNullOrWhiteSpace(u.ProfileImageUrl) ? u.ProfileImageUrl : u.PhotoUrl,
                createdAtUtc = u.CreatedAtUtc
            });
        }

        // ---------------- Helpers ----------------

        private async Task EnsureRole(string identityRole)
        {
            if (!await _roleManager.RoleExistsAsync(identityRole))
                await _roleManager.CreateAsync(new IdentityRole(identityRole));
        }

        private static string ToIdentityRole(string uiRole)
        {
            if (string.IsNullOrWhiteSpace(uiRole)) return RbacRoles.VIEW_ONLY;
            var raw = uiRole.Trim();

            return raw switch
            {
                "Admin" => RbacRoles.ADMIN,
                "Yard Manager" => RbacRoles.YARD_MANAGER,
                "Yard Jockey" => RbacRoles.YARD_JOCKEY,
                "Gate Security" => RbacRoles.GATE_SECURITY,
                "Driver" => RbacRoles.DRIVER,
                "View Only" => RbacRoles.VIEW_ONLY,
                _ => raw.Replace(" ", "")
            };
        }

        private static string ToUiRole(string identityRole)
        {
            if (string.IsNullOrWhiteSpace(identityRole)) return "View Only";

            return identityRole.Trim() switch
            {
                var r when r.Equals(RbacRoles.GATE_SECURITY, StringComparison.OrdinalIgnoreCase) => "Gate Security",
                var r when r.Equals(RbacRoles.YARD_MANAGER, StringComparison.OrdinalIgnoreCase) => "Yard Manager",
                var r when r.Equals(RbacRoles.YARD_JOCKEY, StringComparison.OrdinalIgnoreCase) => "Yard Jockey",
                var r when r.Equals(RbacRoles.VIEW_ONLY, StringComparison.OrdinalIgnoreCase) => "View Only",
                var r when r.Equals(RbacRoles.ADMIN, StringComparison.OrdinalIgnoreCase) => "Admin",
                var r when r.Equals(RbacRoles.DRIVER, StringComparison.OrdinalIgnoreCase) => "Driver",
                _ => identityRole
            };
        }

        private static string GenerateLegacyPublicId()
        {
            var rnd = Random.Shared.Next(100, 999);
            return $"USR-{DateTime.UtcNow:yyyyMMdd}-{rnd}";
        }

        private static string MapIdentityRoleToUiRole(string identityRole)
        {
            if (string.IsNullOrWhiteSpace(identityRole)) return "View Only";

            var r = identityRole.Trim();

            if (string.Equals(r, "User", StringComparison.OrdinalIgnoreCase))
                return "View Only";

            if (string.Equals(r, RbacRoles.VIEW_ONLY, StringComparison.OrdinalIgnoreCase))
                return "View Only";
            if (string.Equals(r, RbacRoles.GATE_SECURITY, StringComparison.OrdinalIgnoreCase))
                return "Gate Security";
            if (string.Equals(r, RbacRoles.YARD_MANAGER, StringComparison.OrdinalIgnoreCase))
                return "Yard Manager";
            if (string.Equals(r, RbacRoles.YARD_JOCKEY, StringComparison.OrdinalIgnoreCase))
                return "Yard Jockey";
            if (string.Equals(r, RbacRoles.DRIVER, StringComparison.OrdinalIgnoreCase))
                return "Driver";
            if (string.Equals(r, RbacRoles.ADMIN, StringComparison.OrdinalIgnoreCase))
                return "Admin";

            return r;
        }

        private static string RoleKeyToCode(string roleKey)
        {
            if (string.Equals(roleKey, RbacRoles.ADMIN, StringComparison.OrdinalIgnoreCase)) return "ADMIN";
            if (string.Equals(roleKey, RbacRoles.YARD_MANAGER, StringComparison.OrdinalIgnoreCase)) return "YARD_MANAGER";
            if (string.Equals(roleKey, RbacRoles.YARD_JOCKEY, StringComparison.OrdinalIgnoreCase)) return "YARD_JOCKEY";
            if (string.Equals(roleKey, RbacRoles.GATE_SECURITY, StringComparison.OrdinalIgnoreCase)) return "GATE_SECURITY";
            if (string.Equals(roleKey, RbacRoles.DRIVER, StringComparison.OrdinalIgnoreCase)) return "DRIVER";
            return "VIEW_ONLY";
        }
    }
}
