using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using YardManagementSystem.Data;
using YardManagementSystem.Dtos;
using YardManagementSystem.Models;

namespace YardManagementSystem.Controllers
{
    [ApiController]
    [Route("api/parking-assignments")]
    public class ParkingAssignmentsController : ControllerBase
    {
        private static readonly HashSet<string> AllowedFinalStatuses =
            new(StringComparer.OrdinalIgnoreCase) { "COMPLETED", "DELAYED", "DAMAGED" };

        private readonly ApplicationDbContext _db;
        public ParkingAssignmentsController(ApplicationDbContext db) => _db = db;

        [HttpGet]
        public async Task<ActionResult<PagedResultDto<ParkingAssignmentItemDto>>> Get(
            [FromQuery] Guid? facilityId = null,
            [FromQuery] Guid? parkingSlotId = null,
            [FromQuery] Guid? arrivalId = null,
            [FromQuery] bool activeOnly = true,
            [FromQuery] int skip = 0,
            [FromQuery] int take = 6)
        {
            if (skip < 0) skip = 0;
            if (take < 1) take = 6;
            if (take > 100) take = 100;

            var q = _db.ParkingAssignments
                .AsNoTracking()
                .Include(x => x.ParkingSlot)
                    .ThenInclude(s => s!.Facility)
                .Include(x => x.Arrival)
                    .ThenInclude(a => a!.Goods)
                .AsQueryable();

            if (parkingSlotId.HasValue && parkingSlotId.Value != Guid.Empty)
                q = q.Where(x => x.ParkingSlotId == parkingSlotId.Value);

            if (arrivalId.HasValue && arrivalId.Value != Guid.Empty)
                q = q.Where(x => x.ArrivalId == arrivalId.Value);

            if (facilityId.HasValue && facilityId.Value != Guid.Empty)
                q = q.Where(x => x.ParkingSlot != null && x.ParkingSlot.FacilityId == facilityId.Value);

            if (activeOnly) q = q.Where(x => x.IsActive);

            var total = await q.CountAsync();

            var items = await q
                .OrderByDescending(x => x.ParkInAt)
                .Skip(skip)
                .Take(take)
                .Select(x => new ParkingAssignmentItemDto
                {
                    Id = x.Id,
                    ParkingSlotId = x.ParkingSlotId,
                    SlotCode = x.ParkingSlot != null ? x.ParkingSlot.SlotCode : "",
                    SlotType = x.ParkingSlot != null ? x.ParkingSlot.SlotType : "",
                    SlotStatus = x.ParkingSlot != null ? x.ParkingSlot.Status : "",

                    ArrivalId = x.ArrivalId,
                    ArrivalActivityId = x.Arrival != null ? x.Arrival.ActivityId : "",
                    TrailerNumber = x.Arrival != null ? x.Arrival.TrailerNumber : null,
                    TrailerType = x.Arrival != null ? x.Arrival.TrailerType : null,
                    DriverName = x.Arrival != null ? x.Arrival.DriverName : null,
                    Purpose = x.Arrival != null ? x.Arrival.Purpose : null,
                    GoodsId = x.Arrival != null ? x.Arrival.GoodsId : null,
                    GoodsName = x.Arrival != null && x.Arrival.Goods != null ? x.Arrival.Goods.GoodsName : null,

                    FacilityId = x.ParkingSlot != null ? x.ParkingSlot.FacilityId : Guid.Empty,
                    FacilityName = x.ParkingSlot != null && x.ParkingSlot.Facility != null ? x.ParkingSlot.Facility.FacilityName : "",

                    ParkInAt = x.ParkInAt,
                    ParkOutAt = x.ParkOutAt,
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

            return Ok(new PagedResultDto<ParkingAssignmentItemDto>
            {
                Total = total,
                Shown = Math.Min(skip + items.Count, total),
                Items = items
            });
        }

        [HttpGet("available-slots")]
        public async Task<ActionResult<List<ParkingSlotItemDto>>> GetAvailableSlots(
            [FromQuery] Guid? facilityId = null,
            [FromQuery] Guid? locationId = null)
        {
            var q = _db.ParkingSlots
                .AsNoTracking()
                .Include(x => x.Facility)
                .Include(x => x.Location)
                .Where(x => (x.Status ?? "").ToUpper() == "AVAILABLE")
                .AsQueryable();

            if (facilityId.HasValue && facilityId.Value != Guid.Empty)
                q = q.Where(x => x.FacilityId == facilityId.Value);

            if (locationId.HasValue && locationId.Value != Guid.Empty)
                q = q.Where(x => x.LocationId == locationId.Value);

            var items = await q
                .OrderBy(x => x.SortOrder)
                .ThenBy(x => x.SlotCode)
                .Select(x => new ParkingSlotItemDto
                {
                    Id = x.Id,
                    FacilityId = x.FacilityId,
                    FacilityName = x.Facility != null ? x.Facility.FacilityName : "",
                    LocationId = x.LocationId,
                    LocationName = x.Location != null ? x.Location.LocationName : "",
                    SlotCode = x.SlotCode,
                    SlotType = x.SlotType,
                    Status = x.Status,
                    SortOrder = x.SortOrder,
                    CreatedAt = x.CreatedAt,
                    UpdatedAt = x.UpdatedAt
                })
                .ToListAsync();

            return Ok(items);
        }

        [HttpPost("assign")]
        public async Task<ActionResult> Assign([FromBody] AssignParkingDto dto)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);

            var slot = await _db.ParkingSlots.FirstOrDefaultAsync(x => x.Id == dto.ParkingSlotId);
            if (slot == null) return BadRequest(new { message = "Parking slot not found." });

            if ((slot.Status ?? "").ToUpper() != "AVAILABLE")
                return BadRequest(new { message = "Parking slot is not available." });

            var arrival = await _db.Arrivals.FirstOrDefaultAsync(x => x.Id == dto.ArrivalId);
            if (arrival == null) return BadRequest(new { message = "Arrival not found." });

            var arrivalStatus = (arrival.Status ?? "").Trim().ToUpperInvariant();
            if (arrivalStatus != "WAITING" && arrivalStatus != "ENTERED")
                return BadRequest(new { message = "Arrival must be WAITING or ENTERED to assign parking." });

            var slotHasActive = await _db.ParkingAssignments.AnyAsync(x => x.ParkingSlotId == dto.ParkingSlotId && x.IsActive);
            if (slotHasActive) return Conflict(new { message = "Parking slot already has an active assignment." });

            var arrivalHasActive = await _db.ParkingAssignments.AnyAsync(x => x.ArrivalId == dto.ArrivalId && x.IsActive);
            if (arrivalHasActive) return Conflict(new { message = "Arrival already has an active parking assignment." });

            var userName = User?.Identity?.Name;

            var assignment = new ParkingAssignment
            {
                Id = Guid.NewGuid(),
                ParkingSlotId = dto.ParkingSlotId,
                ArrivalId = dto.ArrivalId,
                ParkInAt = dto.ParkInAt ?? DateTime.UtcNow,
                IsActive = true,
                Status = "OCCUPIED",
                CreatedAt = DateTime.UtcNow,
                CreatedBy = string.IsNullOrWhiteSpace(userName) ? null : userName
            };

            slot.Status = "OCCUPIED";
            slot.UpdatedAt = DateTime.UtcNow;

            _db.ParkingAssignments.Add(assignment);
            await _db.SaveChangesAsync();

            return Ok(new { id = assignment.Id });
        }

        [HttpPut("{id:guid}/release")]
        public async Task<ActionResult> Release(Guid id, [FromBody] ReleaseParkingDto dto)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);

            var assignment = await _db.ParkingAssignments
                .Include(x => x.ParkingSlot)
                .FirstOrDefaultAsync(x => x.Id == id);

            if (assignment == null) return NotFound(new { message = "Assignment not found." });

            if (!assignment.IsActive || assignment.ParkOutAt != null)
                return BadRequest(new { message = "Parking assignment already released." });

            var finalStatus = string.IsNullOrWhiteSpace(dto.FinalStatus)
                ? "COMPLETED"
                : dto.FinalStatus.Trim().ToUpperInvariant();

            if (!AllowedFinalStatuses.Contains(finalStatus))
                return BadRequest(new { message = "FinalStatus must be COMPLETED, DELAYED, or DAMAGED." });

            assignment.ParkOutAt = dto.ParkOutAt ?? DateTime.UtcNow;
            assignment.ReleasedAt = DateTime.UtcNow;
            assignment.FinalStatus = finalStatus;
            assignment.Status = finalStatus;
            assignment.IsActive = false;
            if (!string.IsNullOrWhiteSpace(dto.Notes)) assignment.Notes = dto.Notes.Trim();

            var userName = User?.Identity?.Name;
            assignment.ReleasedBy = string.IsNullOrWhiteSpace(userName) ? assignment.ReleasedBy : userName;

            if (assignment.ParkingSlot != null)
            {
                assignment.ParkingSlot.Status = "AVAILABLE";
                assignment.ParkingSlot.UpdatedAt = DateTime.UtcNow;
            }

            await _db.SaveChangesAsync();
            return Ok();
        }
    }
}
