using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using YardManagementSystem.Data;
using YardManagementSystem.Dtos;
using YardManagementSystem.Models;

namespace YardManagementSystem.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class LocationsController : ControllerBase
    {
        private readonly ApplicationDbContext _db;

        public LocationsController(ApplicationDbContext db)
        {
            _db = db;
        }

        private static string? NormalizeLocationType(string? input)
        {
            var s = (input ?? "").Trim().ToUpperInvariant();
            if (s == "GATE" || s == "DOCK" || s == "PARKING" || s == "INSPECTION") return s;
            return null;
        }

        // GET /api/locations?search=&skip=0&take=6&facilityId=
        [HttpGet]
        public async Task<ActionResult<PagedResult<LocationItemDto>>> Get(
            [FromQuery] string? search = "",
            [FromQuery] Guid? facilityId = null,
            [FromQuery] int skip = 0,
            [FromQuery] int take = 6
        )
        {
            if (skip < 0) skip = 0;
            if (take <= 0) take = 6;
            if (take > 500) take = 500;

            var q = _db.Locations
                .AsNoTracking()
                .Include(x => x.Facility)
                .AsQueryable();

            if (facilityId.HasValue && facilityId.Value != Guid.Empty)
            {
                q = q.Where(x => x.FacilityId == facilityId.Value);
            }

            var s = (search ?? "").Trim().ToLowerInvariant();
            if (!string.IsNullOrWhiteSpace(s))
            {
                q = q.Where(x =>
                    x.LocationName.ToLower().Contains(s) ||
                    x.LocationCode.ToLower().Contains(s) ||
                    (x.Facility != null && x.Facility.FacilityName.ToLower().Contains(s))
                );
            }

            var total = await q.CountAsync();

            var items = await q
                .OrderBy(x => x.SortOrder)
                .ThenBy(x => x.LocationName)
                .Skip(skip)
                .Take(take)
                .Select(x => new LocationItemDto
                {
                    Id = x.Id,
                    FacilityId = x.FacilityId,
                    FacilityName = x.Facility != null ? x.Facility.FacilityName : "",
                    LocationName = x.LocationName,
                    LocationType = x.LocationType,
                    LocationCode = x.LocationCode,
                    Capacity = x.Capacity,
                    SortOrder = x.SortOrder
                })
                .ToArrayAsync();

            var shown = Math.Min(skip + items.Length, total);

            return Ok(new PagedResult<LocationItemDto>
            {
                Total = total,
                Shown = shown,
                Items = items
            });
        }

        // POST /api/locations
        [HttpPost]
        public async Task<ActionResult<LocationItemDto>> Create([FromBody] LocationCreateUpdateDto dto)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);

            var existsFacility = await _db.Facilities.AnyAsync(f => f.Id == dto.FacilityId);
            if (!existsFacility) return BadRequest(new { message = "Facility not found." });

            var locationType = NormalizeLocationType(dto.LocationType);
            if (locationType == null)
                return BadRequest(new { message = "Invalid locationType. Allowed: GATE, DOCK, PARKING, INSPECTION" });

            var code = (dto.LocationCode ?? "").Trim().ToUpperInvariant();
            if (string.IsNullOrWhiteSpace(code))
                return BadRequest(new { message = "LocationCode is required." });

            var codeExists = await _db.Locations.AnyAsync(x => x.LocationCode == code);
            if (codeExists) return Conflict(new { message = "Location code already exists." });

            var entity = new Location
            {
                Id = Guid.NewGuid(),
                FacilityId = dto.FacilityId,
                LocationName = dto.LocationName.Trim(),
                LocationType = locationType,
                LocationCode = code,
                Capacity = dto.Capacity,
                SortOrder = dto.SortOrder <= 0 ? 1 : dto.SortOrder
            };

            _db.Locations.Add(entity);
            await _db.SaveChangesAsync();

            var facilityName = await _db.Facilities
                .Where(f => f.Id == entity.FacilityId)
                .Select(f => f.FacilityName)
                .FirstAsync();

            return Ok(new LocationItemDto
            {
                Id = entity.Id,
                FacilityId = entity.FacilityId,
                FacilityName = facilityName,
                LocationName = entity.LocationName,
                LocationType = entity.LocationType,
                LocationCode = entity.LocationCode,
                Capacity = entity.Capacity,
                SortOrder = entity.SortOrder
            });
        }

        // PUT /api/locations/{id}
        [HttpPut("{id:guid}")]
        public async Task<IActionResult> Update(Guid id, [FromBody] LocationCreateUpdateDto dto)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);

            var entity = await _db.Locations.FirstOrDefaultAsync(x => x.Id == id);
            if (entity == null) return NotFound(new { message = "Location not found." });

            var existsFacility = await _db.Facilities.AnyAsync(f => f.Id == dto.FacilityId);
            if (!existsFacility) return BadRequest(new { message = "Facility not found." });

            var locationType = NormalizeLocationType(dto.LocationType);
            if (locationType == null)
                return BadRequest(new { message = "Invalid locationType. Allowed: GATE, DOCK, PARKING, INSPECTION" });

            var code = (dto.LocationCode ?? "").Trim().ToUpperInvariant();
            if (string.IsNullOrWhiteSpace(code))
                return BadRequest(new { message = "LocationCode is required." });

            var codeTaken = await _db.Locations.AnyAsync(x => x.LocationCode == code && x.Id != id);
            if (codeTaken) return Conflict(new { message = "Location code already exists." });

            entity.FacilityId = dto.FacilityId;
            entity.LocationName = dto.LocationName.Trim();
            entity.LocationType = locationType;
            entity.LocationCode = code;
            entity.Capacity = dto.Capacity;
            entity.SortOrder = dto.SortOrder <= 0 ? 1 : dto.SortOrder;

            await _db.SaveChangesAsync();
            return NoContent();
        }

        // DELETE /api/locations/{id}
        [HttpDelete("{id:guid}")]
        public async Task<IActionResult> Delete(Guid id)
        {
            var entity = await _db.Locations.FirstOrDefaultAsync(x => x.Id == id);
            if (entity == null) return NotFound(new { message = "Location not found." });

            _db.Locations.Remove(entity);
            await _db.SaveChangesAsync();
            return NoContent();
        }
    }
}
