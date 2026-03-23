using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using YardManagementSystem.Data;
using YardManagementSystem.Dtos;
using YardManagementSystem.Models;

namespace YardManagementSystem.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class GatesController : ControllerBase
    {
        private readonly ApplicationDbContext _db;
        public GatesController(ApplicationDbContext db) => _db = db;

        // GET /api/gates?facilityId=&status=&type=&search=&skip=&take=
        [HttpGet]
        public async Task<ActionResult<PagedResultDto<GateItemDto>>> Get(
            [FromQuery] Guid? facilityId = null,
            [FromQuery] string? status = "",
            [FromQuery] string? type = "",
            [FromQuery] string? search = "",
            [FromQuery] int skip = 0,
            [FromQuery] int take = 6)
        {
            if (skip < 0) skip = 0;
            if (take <= 0) take = 6;
            if (take > 100) take = 100;

            var q = _db.Gates
                .AsNoTracking()
                .Include(g => g.Facility)
                .AsQueryable();

            // Facility filter
            if (facilityId.HasValue && facilityId.Value != Guid.Empty)
                q = q.Where(g => g.FacilityId == facilityId.Value);

            // Status filter (ACTIVE/INACTIVE)
            var sStatus = (status ?? "").Trim().ToUpper();
            if (!string.IsNullOrWhiteSpace(sStatus))
                q = q.Where(g => g.Status.ToUpper() == sStatus);

            // Type filter (ENTRY/EXIT/BOTH) with BOTH logic
            var sType = (type ?? "").Trim().ToUpper();
            if (!string.IsNullOrWhiteSpace(sType))
            {
                if (sType == "ENTRY")
                    q = q.Where(g => g.GateType.ToUpper() == "ENTRY" || g.GateType.ToUpper() == "BOTH");
                else if (sType == "EXIT")
                    q = q.Where(g => g.GateType.ToUpper() == "EXIT" || g.GateType.ToUpper() == "BOTH");
                else if (sType == "BOTH")
                    q = q.Where(g => g.GateType.ToUpper() == "BOTH");
            }

            // Search
            var s = (search ?? "").Trim().ToLower();
            if (!string.IsNullOrWhiteSpace(s))
            {
                q = q.Where(g =>
                    g.GateName.ToLower().Contains(s) ||
                    (g.Facility != null && g.Facility.FacilityName.ToLower().Contains(s))
                );
            }

            var total = await q.CountAsync();

            var items = await q
                .OrderBy(g => g.SortOrder)
                .ThenBy(g => g.GateName)
                .Skip(skip)
                .Take(take)
                .Select(g => new GateItemDto
                {
                    Id = g.Id,
                    FacilityId = g.FacilityId,
                    FacilityName = g.Facility != null ? g.Facility.FacilityName : "",
                    GateName = g.GateName,
                    GateType = g.GateType,
                    Status = g.Status,
                    SortOrder = g.SortOrder
                })
                .ToListAsync();

            var shown = Math.Min(skip + items.Count, total);

            return Ok(new PagedResultDto<GateItemDto>
            {
                Total = total,
                Shown = shown,
                Items = items
            });
        }

        // GET /api/gates/{id}
        [HttpGet("{id:guid}")]
        public async Task<ActionResult<GateItemDto>> GetOne(Guid id)
        {
            var g = await _db.Gates
                .AsNoTracking()
                .Include(x => x.Facility)
                .FirstOrDefaultAsync(x => x.Id == id);

            if (g == null) return NotFound(new { message = "Gate not found." });

            return Ok(new GateItemDto
            {
                Id = g.Id,
                FacilityId = g.FacilityId,
                FacilityName = g.Facility != null ? g.Facility.FacilityName : "",
                GateName = g.GateName,
                GateType = g.GateType,
                Status = g.Status,
                SortOrder = g.SortOrder
            });
        }

        // POST /api/gates
        [HttpPost]
        public async Task<ActionResult<GateItemDto>> Create([FromBody] GateCreateUpdateDto dto)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);

            var facilityId = dto.FacilityId;
            var gateName = (dto.GateName ?? "").Trim();
            var gateType = (dto.GateType ?? "BOTH").Trim().ToUpper();
            var status = (dto.Status ?? "ACTIVE").Trim().ToUpper();
            var sortOrder = dto.SortOrder <= 0 ? 1 : dto.SortOrder;

            if (string.IsNullOrWhiteSpace(gateName))
                return BadRequest(new { message = "Gate name is required." });

            // Validate enums
            if (gateType != "ENTRY" && gateType != "EXIT" && gateType != "BOTH")
                return BadRequest(new { message = "Gate type must be ENTRY, EXIT, or BOTH." });

            if (status != "ACTIVE" && status != "INACTIVE")
                return BadRequest(new { message = "Status must be ACTIVE or INACTIVE." });

            var facility = await _db.Facilities.AsNoTracking()
                .FirstOrDefaultAsync(f => f.Id == facilityId);

            if (facility == null)
                return BadRequest(new { message = "Facility not found." });

            // Duplicate gate name per facility (case-insensitive)
            var exists = await _db.Gates.AnyAsync(g =>
                g.FacilityId == facilityId &&
                g.GateName.ToLower() == gateName.ToLower()
            );

            if (exists)
                return Conflict(new { message = "Gate name already exists in this facility." });

            var entity = new Gate
            {
                Id = Guid.NewGuid(),
                FacilityId = facilityId,
                GateName = gateName,
                GateType = gateType,
                Status = status,
                SortOrder = sortOrder,
                CreatedAtUtc = DateTime.UtcNow,
                UpdatedAtUtc = DateTime.UtcNow
            };

            _db.Gates.Add(entity);
            await _db.SaveChangesAsync();

            return Ok(new GateItemDto
            {
                Id = entity.Id,
                FacilityId = entity.FacilityId,
                FacilityName = facility.FacilityName,
                GateName = entity.GateName,
                GateType = entity.GateType,
                Status = entity.Status,
                SortOrder = entity.SortOrder
            });
        }

        // PUT /api/gates/{id}
        [HttpPut("{id:guid}")]
        public async Task<IActionResult> Update(Guid id, [FromBody] GateCreateUpdateDto dto)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);

            var entity = await _db.Gates.FirstOrDefaultAsync(g => g.Id == id);
            if (entity == null) return NotFound(new { message = "Gate not found." });

            var facilityId = dto.FacilityId;
            var gateName = (dto.GateName ?? "").Trim();
            var gateType = (dto.GateType ?? "BOTH").Trim().ToUpper();
            var status = (dto.Status ?? "ACTIVE").Trim().ToUpper();
            var sortOrder = dto.SortOrder <= 0 ? 1 : dto.SortOrder;

            if (string.IsNullOrWhiteSpace(gateName))
                return BadRequest(new { message = "Gate name is required." });

            if (gateType != "ENTRY" && gateType != "EXIT" && gateType != "BOTH")
                return BadRequest(new { message = "Gate type must be ENTRY, EXIT, or BOTH." });

            if (status != "ACTIVE" && status != "INACTIVE")
                return BadRequest(new { message = "Status must be ACTIVE or INACTIVE." });

            var facilityExists = await _db.Facilities.AnyAsync(f => f.Id == facilityId);
            if (!facilityExists)
                return BadRequest(new { message = "Facility not found." });

            // Duplicate check excluding this gate
            var exists = await _db.Gates.AnyAsync(g =>
                g.FacilityId == facilityId &&
                g.GateName.ToLower() == gateName.ToLower() &&
                g.Id != id
            );

            if (exists)
                return Conflict(new { message = "Gate name already exists in this facility." });

            entity.FacilityId = facilityId;
            entity.GateName = gateName;
            entity.GateType = gateType;
            entity.Status = status;
            entity.SortOrder = sortOrder;
            entity.UpdatedAtUtc = DateTime.UtcNow;

            await _db.SaveChangesAsync();
            return NoContent();
        }

        // DELETE /api/gates/{id}
        [HttpDelete("{id:guid}")]
        public async Task<IActionResult> Delete(Guid id)
        {
            var entity = await _db.Gates.FirstOrDefaultAsync(g => g.Id == id);
            if (entity == null) return NotFound(new { message = "Gate not found." });

            // Your Arrival/Departure stores GateNo as string, so check by name
            var gateName = entity.GateName;

            var usedInArrivals = await _db.Arrivals.AnyAsync(a => a.GateNo == gateName);
            var usedInDepartures = await _db.Departures.AnyAsync(d => d.ExitGateNo == gateName);

            if (usedInArrivals || usedInDepartures)
                return BadRequest(new { message = "Gate is referenced in gate activities and cannot be deleted." });

            _db.Gates.Remove(entity);
            await _db.SaveChangesAsync();
            return NoContent();
        }
    }
}