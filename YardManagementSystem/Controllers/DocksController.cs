using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using YardManagementSystem.Data;
using YardManagementSystem.Dtos;
using YardManagementSystem.Models;

namespace YardManagementSystem.Controllers
{
    [ApiController]
    [Route("api/docks")]
    public class DocksController : ControllerBase
    {
        private static readonly HashSet<string> AllowedDockTypes =
            new(StringComparer.OrdinalIgnoreCase) { "INBOUND", "OUTBOUND", "BOTH" };

        private static readonly HashSet<string> AllowedDockStatuses =
            new(StringComparer.OrdinalIgnoreCase) { "AVAILABLE", "OCCUPIED", "MAINTENANCE", "BLOCKED" };

        private readonly ApplicationDbContext _db;

        public DocksController(ApplicationDbContext db) => _db = db;

        // GET /api/docks?search=&facilityId=&locationId=&status=&skip=&take=
        [HttpGet]
        public async Task<ActionResult<PagedResultDto<DockItemDto>>> Get(
            [FromQuery] string? search = "",
            [FromQuery] Guid? facilityId = null,
            [FromQuery] Guid? locationId = null,
            [FromQuery] string? status = "",
            [FromQuery] int skip = 0,
            [FromQuery] int take = 6)
        {
            if (skip < 0) skip = 0;
            if (take < 1) take = 6;
            if (take > 100) take = 100;

            var q = _db.Docks
                .AsNoTracking()
                .Include(d => d.Facility)
                .Include(d => d.Location)
                .AsQueryable();

            if (facilityId.HasValue && facilityId.Value != Guid.Empty)
                q = q.Where(d => d.FacilityId == facilityId.Value);

            if (locationId.HasValue && locationId.Value != Guid.Empty)
                q = q.Where(d => d.LocationId == locationId.Value);

            var sStatus = (status ?? "").Trim().ToUpperInvariant();
            if (!string.IsNullOrWhiteSpace(sStatus))
                q = q.Where(d => (d.Status ?? "").ToUpper() == sStatus);

            var s = (search ?? "").Trim().ToLowerInvariant();
            if (!string.IsNullOrWhiteSpace(s))
            {
                q = q.Where(d =>
                    d.DockName.ToLower().Contains(s) ||
                    (d.Location != null && d.Location.LocationName.ToLower().Contains(s)) ||
                    (d.Facility != null && d.Facility.FacilityName.ToLower().Contains(s))
                );
            }

            var total = await q.CountAsync();

            var items = await q
                .OrderBy(d => d.SortOrder)
                .ThenBy(d => d.DockName)
                .Skip(skip)
                .Take(take)
                .Select(d => new DockItemDto
                {
                    Id = d.Id,
                    FacilityId = d.FacilityId,
                    FacilityName = d.Facility != null ? d.Facility.FacilityName : string.Empty,
                    LocationId = d.LocationId,
                    LocationName = d.Location != null ? d.Location.LocationName : string.Empty,
                    DockName = d.DockName,
                    DockType = d.DockType,
                    Status = d.Status,
                    SortOrder = d.SortOrder,
                    CreatedAt = d.CreatedAt,
                    UpdatedAt = d.UpdatedAt
                })
                .ToListAsync();

            return Ok(new PagedResultDto<DockItemDto>
            {
                Total = total,
                Shown = Math.Min(skip + items.Count, total),
                Items = items
            });
        }

        // POST /api/docks
        [HttpPost]
        public async Task<ActionResult<DockItemDto>> Create([FromBody] DockCreateUpdateDto dto)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);

            var facilityId = dto.FacilityId;
            var locationId = dto.LocationId;
            var dockName = (dto.DockName ?? string.Empty).Trim();
            var dockType = (dto.DockType ?? "BOTH").Trim().ToUpperInvariant();
            var status = (dto.Status ?? "AVAILABLE").Trim().ToUpperInvariant();
            var sortOrder = dto.SortOrder <= 0 ? 1 : dto.SortOrder;

            if (facilityId == Guid.Empty)
                return BadRequest(new { message = "Facility is required." });

            if (string.IsNullOrWhiteSpace(dockName))
                return BadRequest(new { message = "Dock name is required." });

            if (!AllowedDockTypes.Contains(dockType))
                return BadRequest(new { message = "Dock type must be INBOUND, OUTBOUND, or BOTH." });

            if (!AllowedDockStatuses.Contains(status))
                return BadRequest(new { message = "Status must be AVAILABLE, OCCUPIED, MAINTENANCE, or BLOCKED." });

            var facility = await _db.Facilities.AsNoTracking().FirstOrDefaultAsync(f => f.Id == facilityId);
            if (facility == null)
                return BadRequest(new { message = "Facility not found." });

            Location? location = null;
            if (locationId.HasValue && locationId.Value != Guid.Empty)
            {
                location = await _db.Locations.AsNoTracking()
                    .FirstOrDefaultAsync(l => l.Id == locationId.Value && l.FacilityId == facilityId);

                if (location == null)
                    return BadRequest(new { message = "Location not found for this facility." });
            }

            var exists = await _db.Docks.AnyAsync(d =>
                d.FacilityId == facilityId &&
                d.LocationId == locationId &&
                d.DockName.ToLower() == dockName.ToLower());

            if (exists)
                return Conflict(new { message = "Dock name already exists in this facility/location." });

            var entity = new Dock
            {
                Id = Guid.NewGuid(),
                FacilityId = facilityId,
                LocationId = locationId,
                DockName = dockName,
                DockType = dockType,
                Status = status,
                SortOrder = sortOrder,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            _db.Docks.Add(entity);
            await _db.SaveChangesAsync();

            return Ok(new DockItemDto
            {
                Id = entity.Id,
                FacilityId = entity.FacilityId,
                FacilityName = facility.FacilityName,
                LocationId = entity.LocationId,
                LocationName = location != null ? location.LocationName : string.Empty,
                DockName = entity.DockName,
                DockType = entity.DockType,
                Status = entity.Status,
                SortOrder = entity.SortOrder,
                CreatedAt = entity.CreatedAt,
                UpdatedAt = entity.UpdatedAt
            });
        }

        // PUT /api/docks/{id}
        [HttpPut("{id:guid}")]
        public async Task<IActionResult> Update(Guid id, [FromBody] DockCreateUpdateDto dto)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);

            var entity = await _db.Docks.FirstOrDefaultAsync(d => d.Id == id);
            if (entity == null) return NotFound(new { message = "Dock not found." });

            var facilityId = dto.FacilityId;
            var locationId = dto.LocationId;
            var dockName = (dto.DockName ?? string.Empty).Trim();
            var dockType = (dto.DockType ?? "BOTH").Trim().ToUpperInvariant();
            var status = (dto.Status ?? "AVAILABLE").Trim().ToUpperInvariant();
            var sortOrder = dto.SortOrder <= 0 ? 1 : dto.SortOrder;

            if (facilityId == Guid.Empty)
                return BadRequest(new { message = "Facility is required." });

            if (string.IsNullOrWhiteSpace(dockName))
                return BadRequest(new { message = "Dock name is required." });

            if (!AllowedDockTypes.Contains(dockType))
                return BadRequest(new { message = "Dock type must be INBOUND, OUTBOUND, or BOTH." });

            if (!AllowedDockStatuses.Contains(status))
                return BadRequest(new { message = "Status must be AVAILABLE, OCCUPIED, MAINTENANCE, or BLOCKED." });

            var facilityExists = await _db.Facilities.AnyAsync(f => f.Id == facilityId);
            if (!facilityExists)
                return BadRequest(new { message = "Facility not found." });

            if (locationId.HasValue && locationId.Value != Guid.Empty)
            {
                var locationExists = await _db.Locations.AnyAsync(l => l.Id == locationId.Value && l.FacilityId == facilityId);
                if (!locationExists)
                    return BadRequest(new { message = "Location not found for this facility." });
            }

            // Prevent manual status flip while active assignment exists
            var hasActiveAssignment = await _db.DockAssignments.AnyAsync(a => a.DockId == id && a.IsActive);
            if (hasActiveAssignment && status != "OCCUPIED")
                return BadRequest(new { message = "Dock has active assignment, status must remain OCCUPIED." });

            var exists = await _db.Docks.AnyAsync(d =>
                d.FacilityId == facilityId &&
                d.LocationId == locationId &&
                d.DockName.ToLower() == dockName.ToLower() &&
                d.Id != id);

            if (exists)
                return Conflict(new { message = "Dock name already exists in this facility/location." });

            entity.FacilityId = facilityId;
            entity.LocationId = locationId;
            entity.DockName = dockName;
            entity.DockType = dockType;
            entity.Status = status;
            entity.SortOrder = sortOrder;
            entity.UpdatedAt = DateTime.UtcNow;

            await _db.SaveChangesAsync();
            return NoContent();
        }

        // DELETE /api/docks/{id}
        [HttpDelete("{id:guid}")]
        public async Task<IActionResult> Delete(Guid id)
        {
            var entity = await _db.Docks.FirstOrDefaultAsync(d => d.Id == id);
            if (entity == null) return NotFound(new { message = "Dock not found." });

            var hasActiveAssignments = await _db.DockAssignments.AnyAsync(a => a.DockId == id && a.IsActive);
            if (hasActiveAssignments)
                return BadRequest(new { message = "Dock has active assignment and cannot be deleted." });

            _db.Docks.Remove(entity);
            await _db.SaveChangesAsync();
            return NoContent();
        }
    }
}
