using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using YardManagementSystem.Data;
using YardManagementSystem.Dtos;
using YardManagementSystem.Models;

namespace YardManagementSystem.Controllers
{
    [ApiController]
    [Route("api/parking-slots")]
    public class ParkingSlotsController : ControllerBase
    {
        private readonly ApplicationDbContext _db;
        public ParkingSlotsController(ApplicationDbContext db) => _db = db;

        [HttpGet]
        public async Task<ActionResult<PagedResultDto<ParkingSlotItemDto>>> Get(
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

            var q = _db.ParkingSlots
                .AsNoTracking()
                .Include(x => x.Facility)
                .Include(x => x.Location)
                .AsQueryable();

            if (facilityId.HasValue && facilityId.Value != Guid.Empty)
                q = q.Where(x => x.FacilityId == facilityId.Value);

            if (locationId.HasValue && locationId.Value != Guid.Empty)
                q = q.Where(x => x.LocationId == locationId.Value);

            var sStatus = (status ?? "").Trim().ToUpperInvariant();
            if (!string.IsNullOrWhiteSpace(sStatus))
                q = q.Where(x => x.Status.ToUpper() == sStatus);

            var s = (search ?? "").Trim().ToLower();
            if (!string.IsNullOrWhiteSpace(s))
            {
                q = q.Where(x =>
                    x.SlotCode.ToLower().Contains(s) ||
                    x.SlotType.ToLower().Contains(s) ||
                    (x.Location != null && x.Location.LocationName.ToLower().Contains(s)) ||
                    (x.Facility != null && x.Facility.FacilityName.ToLower().Contains(s))
                );
            }

            var total = await q.CountAsync();

            var items = await q
                .OrderBy(x => x.SortOrder)
                .ThenBy(x => x.SlotCode)
                .Skip(skip)
                .Take(take)
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

            return Ok(new PagedResultDto<ParkingSlotItemDto>
            {
                Total = total,
                Shown = Math.Min(skip + items.Count, total),
                Items = items
            });
        }

        [HttpPost]
        public async Task<ActionResult<ParkingSlotItemDto>> Create([FromBody] ParkingSlotCreateUpdateDto dto)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);

            var slotCode = (dto.SlotCode ?? "").Trim().ToUpperInvariant();
            var slotType = (dto.SlotType ?? "GENERAL").Trim().ToUpperInvariant();
            var status = (dto.Status ?? "AVAILABLE").Trim().ToUpperInvariant();
            var sortOrder = dto.SortOrder <= 0 ? 1 : dto.SortOrder;

            if (string.IsNullOrWhiteSpace(slotCode))
                return BadRequest(new { message = "Slot code is required." });

            var facility = await _db.Facilities.AsNoTracking().FirstOrDefaultAsync(x => x.Id == dto.FacilityId);
            if (facility == null) return BadRequest(new { message = "Facility not found." });

            var location = await _db.Locations.AsNoTracking()
                .FirstOrDefaultAsync(x => x.Id == dto.LocationId && x.FacilityId == dto.FacilityId);
            if (location == null) return BadRequest(new { message = "Location not found for this facility." });

            var exists = await _db.ParkingSlots.AnyAsync(x =>
                x.FacilityId == dto.FacilityId &&
                x.LocationId == dto.LocationId &&
                x.SlotCode.ToLower() == slotCode.ToLower());

            if (exists) return Conflict(new { message = "Slot code already exists in this location." });

            var entity = new ParkingSlot
            {
                Id = Guid.NewGuid(),
                FacilityId = dto.FacilityId,
                LocationId = dto.LocationId,
                SlotCode = slotCode,
                SlotType = slotType,
                Status = status,
                SortOrder = sortOrder,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            _db.ParkingSlots.Add(entity);
            await _db.SaveChangesAsync();

            return Ok(new ParkingSlotItemDto
            {
                Id = entity.Id,
                FacilityId = entity.FacilityId,
                FacilityName = facility.FacilityName,
                LocationId = entity.LocationId,
                LocationName = location.LocationName,
                SlotCode = entity.SlotCode,
                SlotType = entity.SlotType,
                Status = entity.Status,
                SortOrder = entity.SortOrder,
                CreatedAt = entity.CreatedAt,
                UpdatedAt = entity.UpdatedAt
            });
        }

        [HttpPut("{id:guid}")]
        public async Task<IActionResult> Update(Guid id, [FromBody] ParkingSlotCreateUpdateDto dto)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);

            var entity = await _db.ParkingSlots.FirstOrDefaultAsync(x => x.Id == id);
            if (entity == null) return NotFound(new { message = "Parking slot not found." });

            var slotCode = (dto.SlotCode ?? "").Trim().ToUpperInvariant();
            var slotType = (dto.SlotType ?? "GENERAL").Trim().ToUpperInvariant();
            var status = (dto.Status ?? "AVAILABLE").Trim().ToUpperInvariant();
            var sortOrder = dto.SortOrder <= 0 ? 1 : dto.SortOrder;

            if (string.IsNullOrWhiteSpace(slotCode))
                return BadRequest(new { message = "Slot code is required." });

            var facilityExists = await _db.Facilities.AnyAsync(x => x.Id == dto.FacilityId);
            if (!facilityExists) return BadRequest(new { message = "Facility not found." });

            var locationExists = await _db.Locations.AnyAsync(x => x.Id == dto.LocationId && x.FacilityId == dto.FacilityId);
            if (!locationExists) return BadRequest(new { message = "Location not found for this facility." });

            var exists = await _db.ParkingSlots.AnyAsync(x =>
                x.FacilityId == dto.FacilityId &&
                x.LocationId == dto.LocationId &&
                x.SlotCode.ToLower() == slotCode.ToLower() &&
                x.Id != id);

            if (exists) return Conflict(new { message = "Slot code already exists in this location." });

            entity.FacilityId = dto.FacilityId;
            entity.LocationId = dto.LocationId;
            entity.SlotCode = slotCode;
            entity.SlotType = slotType;
            entity.Status = status;
            entity.SortOrder = sortOrder;
            entity.UpdatedAt = DateTime.UtcNow;

            await _db.SaveChangesAsync();
            return NoContent();
        }

        [HttpDelete("{id:guid}")]
        public async Task<IActionResult> Delete(Guid id)
        {
            var entity = await _db.ParkingSlots.FirstOrDefaultAsync(x => x.Id == id);
            if (entity == null) return NotFound(new { message = "Parking slot not found." });

            var hasAssignments = await _db.ParkingAssignments.AnyAsync(x => x.ParkingSlotId == id);
            if (hasAssignments) return BadRequest(new { message = "Slot has assignments and cannot be deleted." });

            _db.ParkingSlots.Remove(entity);
            await _db.SaveChangesAsync();
            return NoContent();
        }
    }
}
