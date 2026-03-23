using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using YardManagementSystem.Data;
using YardManagementSystem.Dtos;
using YardManagementSystem.Models;

namespace YardManagementSystem.Controllers
{
    [ApiController]
    [Route("api/dock-assignments")]
    public class DockAssignmentsController : ControllerBase
    {
        private static readonly HashSet<string> AllowedFinalStatuses =
            new(StringComparer.OrdinalIgnoreCase) { "COMPLETED", "DELAYED", "DAMAGED" };

        private readonly ApplicationDbContext _db;

        public DockAssignmentsController(ApplicationDbContext db) => _db = db;

        // GET /api/dock-assignments?facilityId=&dockId=&arrivalId=&activeOnly=true&skip=&take=
        [HttpGet]
        public async Task<ActionResult<PagedResultDto<DockAssignmentItemDto>>> Get(
            [FromQuery] Guid? facilityId = null,
            [FromQuery] Guid? dockId = null,
            [FromQuery] Guid? arrivalId = null,
            [FromQuery] bool activeOnly = true,
            [FromQuery] int skip = 0,
            [FromQuery] int take = 6)
        {
            if (skip < 0) skip = 0;
            if (take < 1) take = 6;
            if (take > 100) take = 100;

            var q = _db.DockAssignments
                .AsNoTracking()
                .Include(x => x.Dock)
                    .ThenInclude(d => d!.Facility)
                .Include(x => x.Arrival)
                    .ThenInclude(a => a!.Goods)
                .AsQueryable();

            if (dockId.HasValue && dockId.Value != Guid.Empty)
                q = q.Where(x => x.DockId == dockId.Value);

            if (arrivalId.HasValue && arrivalId.Value != Guid.Empty)
                q = q.Where(x => x.ArrivalId == arrivalId.Value);

            if (facilityId.HasValue && facilityId.Value != Guid.Empty)
                q = q.Where(x => x.Dock != null && x.Dock.FacilityId == facilityId.Value);

            if (activeOnly)
                q = q.Where(x => x.IsActive);

            var total = await q.CountAsync();

            var items = await q
                .OrderByDescending(x => x.DockInAt)
                .Skip(skip)
                .Take(take)
                .Select(x => new DockAssignmentItemDto
                {
                    Id = x.Id,

                    DockId = x.DockId,
                    DockName = x.Dock != null ? x.Dock.DockName : string.Empty,
                    DockType = x.Dock != null ? x.Dock.DockType : string.Empty,
                    DockStatus = x.Dock != null ? x.Dock.Status : string.Empty,

                    ArrivalId = x.ArrivalId,
                    ArrivalActivityId = x.Arrival != null ? x.Arrival.ActivityId : string.Empty,
                    TrailerType = x.Arrival != null ? x.Arrival.TrailerType : null,
                    TrailerNumber = x.Arrival != null ? x.Arrival.TrailerNumber : null,
                    DriverName = x.Arrival != null ? x.Arrival.DriverName : null,
                    Purpose = x.Arrival != null ? x.Arrival.Purpose : null,
                    GoodsId = x.Arrival != null ? x.Arrival.GoodsId : null,
                    GoodsName = x.Arrival != null && x.Arrival.Goods != null ? x.Arrival.Goods.GoodsName : null,
                    ArrivalStatus = x.Arrival != null ? x.Arrival.Status : string.Empty,

                    FacilityId = x.Dock != null ? x.Dock.FacilityId : Guid.Empty,
                    FacilityName = x.Dock != null && x.Dock.Facility != null ? x.Dock.Facility.FacilityName : string.Empty,

                    DockInAt = x.DockInAt,
                    DockOutAt = x.DockOutAt,

                    IsActive = x.IsActive,
                    Status = x.Status,
                    FinalStatus = x.FinalStatus,

                    Notes = x.Notes,
                    CreatedBy = x.CreatedBy,
                    ReleasedBy = x.ReleasedBy,
                    CreatedAt = x.CreatedAt,
                    ReleasedAt = x.ReleasedAt
                })
                .ToListAsync();

            return Ok(new PagedResultDto<DockAssignmentItemDto>
            {
                Total = total,
                Shown = Math.Min(skip + items.Count, total),
                Items = items
            });
        }

        // GET /api/dock-assignments/available-docks?facilityId=&locationId=
        [HttpGet("available-docks")]
        public async Task<ActionResult<List<DockItemDto>>> GetAvailableDocks(
            [FromQuery] Guid? facilityId = null,
            [FromQuery] Guid? locationId = null)
        {
            var q = _db.Docks
                .AsNoTracking()
                .Include(d => d.Facility)
                .Include(d => d.Location)
                .Where(d => (d.Status ?? "").ToUpper() == "AVAILABLE")
                .AsQueryable();

            if (facilityId.HasValue && facilityId.Value != Guid.Empty)
                q = q.Where(d => d.FacilityId == facilityId.Value);

            if (locationId.HasValue && locationId.Value != Guid.Empty)
                q = q.Where(d => d.LocationId == locationId.Value);

            var items = await q
                .OrderBy(d => d.SortOrder)
                .ThenBy(d => d.DockName)
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

            return Ok(items);
        }

        // POST /api/dock-assignments/assign
        [HttpPost("assign")]
        public async Task<ActionResult> AssignDock([FromBody] AssignDockDto dto)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);

            var dock = await _db.Docks.FirstOrDefaultAsync(d => d.Id == dto.DockId);
            if (dock == null) return BadRequest(new { message = "Dock not found." });

            if ((dock.Status ?? "").Trim().ToUpper() != "AVAILABLE")
                return BadRequest(new { message = "Dock is not available." });

            var arrival = await _db.Arrivals.FirstOrDefaultAsync(a => a.Id == dto.ArrivalId);
            if (arrival == null) return BadRequest(new { message = "Arrival not found." });

            var arrivalStatus = (arrival.Status ?? "").Trim().ToUpper();
            if (arrivalStatus != "WAITING" && arrivalStatus != "ENTERED")
                return BadRequest(new { message = "Arrival must be WAITING or ENTERED to assign a dock." });

            if (!arrival.LocationId.HasValue || arrival.LocationId.Value == Guid.Empty)
                return BadRequest(new { message = "Arrival location is required for dock assignment." });

            if (!dock.LocationId.HasValue || dock.LocationId.Value == Guid.Empty)
                return BadRequest(new { message = "Dock location is required for dock assignment." });

            if (dock.LocationId.Value != arrival.LocationId.Value)
                return BadRequest(new { message = "Dock location must match arrival location." });

            var dockHasActive = await _db.DockAssignments.AnyAsync(x => x.DockId == dto.DockId && x.IsActive);
            if (dockHasActive) return Conflict(new { message = "Dock already has an active assignment." });

            var arrivalHasActive = await _db.DockAssignments.AnyAsync(x => x.ArrivalId == dto.ArrivalId && x.IsActive);
            if (arrivalHasActive) return Conflict(new { message = "Arrival already has an active dock assignment." });

            var userName = User?.Identity?.Name;

            var assignment = new DockAssignment
            {
                Id = Guid.NewGuid(),
                DockId = dto.DockId,
                ArrivalId = dto.ArrivalId,
                DockInAt = dto.DockInAt ?? DateTime.UtcNow,
                CreatedAt = DateTime.UtcNow,
                IsActive = true,
                Status = "OCCUPIED",
                CreatedBy = string.IsNullOrWhiteSpace(userName) ? null : userName
            };

            dock.Status = "OCCUPIED";
            dock.UpdatedAt = DateTime.UtcNow;

            _db.DockAssignments.Add(assignment);
            await _db.SaveChangesAsync();

            return Ok(new { id = assignment.Id });
        }

        // PUT /api/dock-assignments/{id}/release
        [HttpPut("{id:guid}/release")]
        public async Task<ActionResult> ReleaseDock(Guid id, [FromBody] ReleaseDockDto dto)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);

            var assignment = await _db.DockAssignments
                .Include(x => x.Dock)
                .FirstOrDefaultAsync(x => x.Id == id);

            if (assignment == null) return NotFound(new { message = "Assignment not found." });

            if (!assignment.IsActive || assignment.DockOutAt != null)
                return BadRequest(new { message = "Dock assignment already released." });

            var finalStatus = string.IsNullOrWhiteSpace(dto.FinalStatus)
                ? "COMPLETED"
                : dto.FinalStatus.Trim().ToUpperInvariant();

            if (!AllowedFinalStatuses.Contains(finalStatus))
                return BadRequest(new { message = "FinalStatus must be COMPLETED, DELAYED, or DAMAGED." });

            assignment.DockOutAt = dto.DockOutAt ?? DateTime.UtcNow;
            assignment.ReleasedAt = DateTime.UtcNow;
            assignment.FinalStatus = finalStatus;
            assignment.Status = finalStatus;
            assignment.IsActive = false;

            if (!string.IsNullOrWhiteSpace(dto.Notes))
                assignment.Notes = dto.Notes.Trim();

            var userName = User?.Identity?.Name;
            assignment.ReleasedBy = string.IsNullOrWhiteSpace(userName) ? assignment.ReleasedBy : userName;

            if (assignment.Dock != null)
            {
                assignment.Dock.Status = "AVAILABLE";
                assignment.Dock.UpdatedAt = DateTime.UtcNow;
            }

            await _db.SaveChangesAsync();
            return Ok();
        }
    }
}
