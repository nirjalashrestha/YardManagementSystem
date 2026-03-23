using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using YardManagementSystem.Data;
using YardManagementSystem.DTOs;
using YardManagementSystem.Models;

namespace YardManagementSystem.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class VehiclesController : ControllerBase
    {
        private readonly ApplicationDbContext _db;
        private readonly IWebHostEnvironment _env;

        public VehiclesController(ApplicationDbContext db, IWebHostEnvironment env)
        {
            _db = db;
            _env = env;
        }

        private static string NormTN(string? tn)
            => (tn ?? "").Trim().ToUpper().Replace(" ", "");

        // GET: /api/vehicles
        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var list = await _db.Vehicles
                .Include(v => v.Facility)
                .OrderByDescending(v => v.CreatedAt)
                .ToListAsync();

            return Ok(list);
        }

        // POST: /api/vehicles
        [HttpPost]
        public async Task<IActionResult> Create([FromBody] VehicleUpsertDto dto)
        {
            var trailerNumber = NormTN(dto.TrailerNumber);
            var vehicleType = (dto.VehicleType ?? "").Trim();
            var status = (dto.Status ?? "ACTIVE").Trim().ToUpper();
            var facilityIdParsed = Guid.TryParse(dto.FacilityId, out var fid) ? fid : Guid.Empty;

            var vehicleNumber = string.IsNullOrWhiteSpace(dto.VehicleNumber)
                ? null
                : dto.VehicleNumber.Trim().ToUpper();

            if (facilityIdParsed == Guid.Empty)
                return BadRequest("Facility is required.");

            if (string.IsNullOrWhiteSpace(trailerNumber))
                return BadRequest("Trailer number is required.");

            if (string.IsNullOrWhiteSpace(vehicleType))
                return BadRequest("Trailer type is required.");

            var facilityExists = await _db.Facilities.AnyAsync(f => f.Id == facilityIdParsed);
            if (!facilityExists) return BadRequest("Facility not found.");

            var exists = await _db.Vehicles.AnyAsync(v => v.TrailerNumber == trailerNumber);
            if (exists) return BadRequest("Trailer number already exists.");

            var v = new Vehicle
            {
                FacilityId = facilityIdParsed,
                TrailerNumber = trailerNumber,
                VehicleNumber = vehicleNumber,
                VehicleType = vehicleType,
                Status = status,
                DriverRefId = string.IsNullOrWhiteSpace(dto.DriverRefId) ? null : dto.DriverRefId.Trim(),
                CarrierName = string.IsNullOrWhiteSpace(dto.CarrierName) ? null : dto.CarrierName.Trim(),
                Notes = string.IsNullOrWhiteSpace(dto.Notes) ? null : dto.Notes.Trim(),
                CreatedAt = DateTime.UtcNow
            };

            _db.Vehicles.Add(v);
            await _db.SaveChangesAsync();

            return Ok(v);
        }

        // PUT: /api/vehicles/{trailerNumber}
        [HttpPut("{trailerNumber}")]
        public async Task<IActionResult> Update(string trailerNumber, [FromBody] VehicleUpsertDto dto)
        {
            var tn = NormTN(trailerNumber);

            var v = await _db.Vehicles.FirstOrDefaultAsync(x => x.TrailerNumber == tn);
            if (v == null) return NotFound("Vehicle not found.");

            var vehicleType = (dto.VehicleType ?? "").Trim();
            var status = (dto.Status ?? "ACTIVE").Trim().ToUpper();
            var facilityIdParsed = Guid.TryParse(dto.FacilityId, out var fid) ? fid : Guid.Empty;
            if (string.IsNullOrWhiteSpace(vehicleType))
                return BadRequest("Trailer type is required.");

            if (facilityIdParsed == Guid.Empty)
                return BadRequest("Facility is required.");

            var facilityExists = await _db.Facilities.AnyAsync(f => f.Id == facilityIdParsed);
            if (!facilityExists) return BadRequest("Facility not found.");

            v.VehicleType = vehicleType;
            v.FacilityId = facilityIdParsed;
            v.Status = status;
            v.VehicleNumber = string.IsNullOrWhiteSpace(dto.VehicleNumber) ? null : dto.VehicleNumber.Trim().ToUpper();
            v.DriverRefId = string.IsNullOrWhiteSpace(dto.DriverRefId) ? null : dto.DriverRefId.Trim();
            v.CarrierName = string.IsNullOrWhiteSpace(dto.CarrierName) ? null : dto.CarrierName.Trim();
            v.Notes = string.IsNullOrWhiteSpace(dto.Notes) ? null : dto.Notes.Trim();

            await _db.SaveChangesAsync();
            return Ok(v);
        }

        // DELETE: /api/vehicles/{trailerNumber}
        [HttpDelete("{trailerNumber}")]
        public async Task<IActionResult> Delete(string trailerNumber)
        {
            var tn = NormTN(trailerNumber);

            var v = await _db.Vehicles.FirstOrDefaultAsync(x => x.TrailerNumber == tn);
            if (v == null) return NotFound("Vehicle not found.");

            if (!string.IsNullOrWhiteSpace(v.PhotoUrl))
                TryDeleteFileFromPhotoUrl(v.PhotoUrl);

            _db.Vehicles.Remove(v);
            await _db.SaveChangesAsync();

            return Ok(new { message = "Deleted" });
        }

        // POST: /api/vehicles/{trailerNumber}/photo
        [HttpPost("{trailerNumber}/photo")]
        public async Task<IActionResult> UploadPhoto(string trailerNumber, IFormFile file)
        {
            if (file == null || file.Length == 0)
                return BadRequest("No file uploaded.");

            var tn = NormTN(trailerNumber);

            var v = await _db.Vehicles.FirstOrDefaultAsync(x => x.TrailerNumber == tn);
            if (v == null) return NotFound("Vehicle not found.");

            var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
            var allowed = new[] { ".jpg", ".jpeg", ".png", ".webp" };
            if (!allowed.Contains(ext))
                return BadRequest("Only jpg, jpeg, png, webp are allowed.");

            var uploadsDir = Path.Combine(_env.WebRootPath, "uploads", "vehicles");
            Directory.CreateDirectory(uploadsDir);

            var safeTn = tn.Replace("/", "_").Replace("\\", "_");
            var filename = $"{safeTn}_{DateTime.UtcNow:yyyyMMddHHmmssfff}{ext}";
            var savePath = Path.Combine(uploadsDir, filename);

            using (var stream = System.IO.File.Create(savePath))
                await file.CopyToAsync(stream);

            if (!string.IsNullOrWhiteSpace(v.PhotoUrl))
                TryDeleteFileFromPhotoUrl(v.PhotoUrl);

            v.PhotoUrl = $"/uploads/vehicles/{filename}";
            await _db.SaveChangesAsync();

            return Ok(new { photoUrl = v.PhotoUrl });
        }

        // DELETE: /api/vehicles/{trailerNumber}/photo
        [HttpDelete("{trailerNumber}/photo")]
        public async Task<IActionResult> DeletePhoto(string trailerNumber)
        {
            var tn = NormTN(trailerNumber);

            var v = await _db.Vehicles.FirstOrDefaultAsync(x => x.TrailerNumber == tn);
            if (v == null) return NotFound("Vehicle not found.");

            if (string.IsNullOrWhiteSpace(v.PhotoUrl))
                return BadRequest("Vehicle has no photo.");

            TryDeleteFileFromPhotoUrl(v.PhotoUrl);

            v.PhotoUrl = null;
            await _db.SaveChangesAsync();

            return Ok(new { message = "Photo deleted successfully." });
        }

        private void TryDeleteFileFromPhotoUrl(string photoUrl)
        {
            try
            {
                var rel = photoUrl.TrimStart('/')
                    .Replace("/", Path.DirectorySeparatorChar.ToString());

                var full = Path.Combine(_env.WebRootPath, rel);

                if (System.IO.File.Exists(full))
                    System.IO.File.Delete(full);
            }
            catch { }
        }
    }
}