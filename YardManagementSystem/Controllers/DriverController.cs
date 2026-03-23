using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using YardManagementSystem.Data;
using YardManagementSystem.Dtos;
using YardManagementSystem.Models;

namespace YardManagementSystem.Controllers
{
    [ApiController]
    [Route("api/drivers")]
    public class DriversController : ControllerBase
    {
        private readonly ApplicationDbContext _db;
        private readonly UserManager<ApplicationUsers> _userManager;
        private readonly RoleManager<IdentityRole> _roleManager;

        public DriversController(
            ApplicationDbContext db,
            UserManager<ApplicationUsers> userManager,
            RoleManager<IdentityRole> roleManager)
        {
            _db = db;
            _userManager = userManager;
            _roleManager = roleManager;
        }

        // POST /api/drivers
        // Creates a user with role=Driver
        [HttpPost]
        public async Task<IActionResult> Create([FromBody] DriverCreateDto dto)
        {
            // 1) PublicId unique (DRV-...)
            var publicId = dto.DriverId.Trim();
            var existsPublicId = await _db.Users.AnyAsync(u => u.PublicId == publicId);
            if (existsPublicId) return Conflict(new { message = "DriverId already exists." });

            // 2) Email unique
            var email = dto.Email?.Trim();
            if (!string.IsNullOrWhiteSpace(email))
            {
                var existsEmail = await _userManager.FindByEmailAsync(email);
                if (existsEmail != null) return Conflict(new { message = "Email already exists." });
            }

            // 3) Ensure role exists
            if (!await _roleManager.RoleExistsAsync("Driver"))
                await _roleManager.CreateAsync(new IdentityRole("Driver"));

            // 4) Create Identity user
            var user = new ApplicationUsers
            {
                PublicId = publicId,
                FullName = dto.FullName.Trim(),
                Email = email,
                UserName = email, // login by email
                CountryCode = dto.CountryCode?.Trim() ?? "+977",
                PhoneNumber2 = dto.PhoneNumber?.Trim() ?? "",
                Address = dto.Address?.Trim() ?? "",
                Status = dto.Status?.Trim() ?? "Active",
                LicenseNumber = dto.LicenseNumber?.Trim(),
                PhotoUrl = string.IsNullOrWhiteSpace(dto.PhotoUrl) ? null : dto.PhotoUrl.Trim(),
                EmailConfirmed = true,      // up to you
                IsEmailVerified = true      // up to you
            };

            // password is required for create
            if (string.IsNullOrWhiteSpace(dto.Password) || dto.Password.Length < 6)
                return BadRequest(new { message = "Password must be at least 6 characters." });

            var create = await _userManager.CreateAsync(user, dto.Password);
            if (!create.Succeeded) return BadRequest(create.Errors);

            await _userManager.AddToRoleAsync(user, "Driver");

            return Ok(ToDriverResponse(user));
        }

        // GET /api/drivers
        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            // Best way: users in Driver role
            var drivers = await _userManager.GetUsersInRoleAsync("Driver");

            // order by CreatedAt isn't available by default in IdentityUser
            // so just order by PublicId / Email / etc
            var list = drivers
                .OrderByDescending(d => d.PublicId)
                .Select(ToDriverResponse)
                .ToList();

            return Ok(list);
        }

        // PUT /api/drivers/{driverId}
        [HttpPut("{driverId}")]
        public async Task<IActionResult> Update(string driverId, [FromBody] DriverUpdateDto dto)
        {
            var user = await _db.Users.FirstOrDefaultAsync(u => u.PublicId == driverId);
            if (user == null) return NotFound(new { message = "Driver not found." });

            // Update fields
            user.FullName = dto.FullName.Trim();
            user.CountryCode = dto.CountryCode?.Trim() ?? user.CountryCode;
            user.PhoneNumber2 = dto.PhoneNumber?.Trim() ?? user.PhoneNumber2;
            user.Address = dto.Address?.Trim() ?? user.Address;
            user.Status = dto.Status?.Trim() ?? user.Status;
            user.LicenseNumber = dto.LicenseNumber?.Trim();
            user.PhotoUrl = string.IsNullOrWhiteSpace(dto.PhotoUrl) ? user.PhotoUrl : dto.PhotoUrl.Trim();

            // Email update (optional)
            if (!string.IsNullOrWhiteSpace(dto.Email))
            {
                var newEmail = dto.Email.Trim();
                var other = await _userManager.FindByEmailAsync(newEmail);
                if (other != null && other.Id != user.Id)
                    return Conflict(new { message = "Email already exists." });

                user.Email = newEmail;
                user.UserName = newEmail;
            }

            // Password update (optional): only if provided
            if (!string.IsNullOrWhiteSpace(dto.Password))
            {
                if (dto.Password.Length < 6)
                    return BadRequest(new { message = "Password must be at least 6 characters." });

                // Reset password safely
                var token = await _userManager.GeneratePasswordResetTokenAsync(user);
                var reset = await _userManager.ResetPasswordAsync(user, token, dto.Password);
                if (!reset.Succeeded) return BadRequest(reset.Errors);
            }

            await _userManager.UpdateAsync(user);

            // Ensure they stay Driver role
            if (!await _roleManager.RoleExistsAsync("Driver"))
                await _roleManager.CreateAsync(new IdentityRole("Driver"));

            var roles = await _userManager.GetRolesAsync(user);
            if (!roles.Contains("Driver"))
                await _userManager.AddToRoleAsync(user, "Driver");

            return Ok(ToDriverResponse(user));
        }

        // DELETE /api/drivers/{driverId}
        [HttpDelete("{driverId}")]
        public async Task<IActionResult> Delete(string driverId)
        {
            var user = await _db.Users.FirstOrDefaultAsync(u => u.PublicId == driverId);
            if (user == null) return NotFound();

            await _userManager.DeleteAsync(user);
            return NoContent();
        }

        // POST /api/drivers/{driverId}/photo
        [HttpPost("{driverId}/photo")]
        public async Task<IActionResult> UploadPhoto(string driverId, [FromForm] DriverPhotoUploadDto dto)
        {
            var user = await _db.Users.FirstOrDefaultAsync(u => u.PublicId == driverId);
            if (user == null) return NotFound(new { message = "Driver not found" });

            var file = dto.File;
            if (file == null || file.Length == 0)
                return BadRequest(new { message = "No file uploaded" });

            var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
            var allowed = new[] { ".jpg", ".jpeg", ".png", ".webp" };
            if (!allowed.Contains(ext))
                return BadRequest(new { message = "Only jpg, jpeg, png, webp allowed" });

            var uploadsDir = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "uploads", "drivers");
            Directory.CreateDirectory(uploadsDir);

            var safeName = $"{driverId}_{Guid.NewGuid():N}{ext}";
            var savePath = Path.Combine(uploadsDir, safeName);

            using (var stream = System.IO.File.Create(savePath))
                await file.CopyToAsync(stream);

            user.PhotoUrl = $"/uploads/drivers/{safeName}";
            await _userManager.UpdateAsync(user);

            return Ok(new { photoUrl = user.PhotoUrl });
        }

        private static object ToDriverResponse(ApplicationUsers u) => new
        {
            userId = u.PublicId,                 // so frontend uses u.userId
            fullName = u.FullName,
            licenseNumber = u.LicenseNumber,
            countryCode = u.CountryCode,
            phoneNumber = u.PhoneNumber2,        // or u.PhoneNumber if you used Identity field
            email = u.Email,
            address = u.Address,
            status = u.Status,
            role = "Driver",
            photoUrl = u.PhotoUrl
        };
    }
}