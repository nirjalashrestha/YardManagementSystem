using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using YardManagementSystem.Data;
using YardManagementSystem.Dtos;
using YardManagementSystem.Models;

namespace YardManagementSystem.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class CarriersController : ControllerBase
    {
        private readonly ApplicationDbContext _db;
        public CarriersController(ApplicationDbContext db) => _db = db;

        // GET /api/carriers?search=&facilityId=&skip=0&take=6
        [HttpGet]
        public async Task<ActionResult<PagedResult<CarrierItemDto>>> Get(
            [FromQuery] string? search = "",
            [FromQuery] Guid? facilityId = null,
            [FromQuery] int skip = 0,
            [FromQuery] int take = 6)
        {
            if (skip < 0) skip = 0;
            if (take <= 0) take = 6;
            if (take > 100) take = 100;

            var q = _db.Carriers
                .AsNoTracking()
                .Include(c => c.Facility)
                .AsQueryable();

            if (facilityId.HasValue && facilityId.Value != Guid.Empty)
                q = q.Where(c => c.FacilityId == facilityId.Value);

            var s = (search ?? "").Trim().ToLower();
            if (!string.IsNullOrWhiteSpace(s))
            {
                q = q.Where(c =>
                    c.CarrierName.ToLower().Contains(s) ||
                    c.CarrierCode.ToLower().Contains(s) ||
                    (c.Facility != null && c.Facility.FacilityName.ToLower().Contains(s))
                );
            }

            var total = await q.CountAsync();

            var items = await q
                .OrderBy(c => c.CarrierName)
                .Skip(skip)
                .Take(take)
                .Select(c => new CarrierItemDto
                {
                    Id = c.Id,
                    CarrierName = c.CarrierName,
                    CarrierCode = c.CarrierCode,
                    FacilityId = c.FacilityId,
                    FacilityName = c.Facility != null ? c.Facility.FacilityName : "",
                    SortOrder = c.SortOrder
                })
                .ToArrayAsync();

            var shown = Math.Min(skip + items.Length, total);

            return Ok(new PagedResult<CarrierItemDto>
            {
                Total = total,
                Shown = shown,
                Items = items
            });
        }

        // POST /api/carriers
        [HttpPost]
        public async Task<ActionResult<CarrierItemDto>> Create([FromBody] CarrierCreateUpdateDto dto)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);

            var name = dto.CarrierName.Trim();
            var code = dto.CarrierCode.Trim().ToUpper();
            var facilityId = dto.FacilityId;
            var sortOrder = dto.SortOrder <= 0 ? 1 : dto.SortOrder;

            // ensure facility exists
            var facility = await _db.Facilities.AsNoTracking().FirstOrDefaultAsync(f => f.Id == facilityId);
            if (facility == null) return BadRequest(new { message = "Facility not found." });

            // unique code check
            var exists = await _db.Carriers.AnyAsync(x =>
                x.FacilityId == facilityId &&
                x.CarrierCode == code);
            if (exists) return Conflict(new { message = "Carrier code already exists." });

            var entity = new Carrier
            {
                Id = Guid.NewGuid(),
                CarrierName = name,
                CarrierCode = code,
                FacilityId = facilityId,
                SortOrder = sortOrder
            };

            _db.Carriers.Add(entity);
            await _db.SaveChangesAsync();

            return Ok(new CarrierItemDto
            {
                Id = entity.Id,
                CarrierName = entity.CarrierName,
                CarrierCode = entity.CarrierCode,
                FacilityId = facilityId,
                FacilityName = facility.FacilityName,
                SortOrder = entity.SortOrder
            });
        }

        // PUT /api/carriers/{id}
        [HttpPut("{id:guid}")]
        public async Task<IActionResult> Update(Guid id, [FromBody] CarrierCreateUpdateDto dto)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);

            var entity = await _db.Carriers.FirstOrDefaultAsync(c => c.Id == id);
            if (entity == null) return NotFound(new { message = "Carrier not found." });

            var name = dto.CarrierName.Trim();
            var code = dto.CarrierCode.Trim().ToUpper();
            var facilityId = dto.FacilityId;
            var sortOrder = dto.SortOrder <= 0 ? 1 : dto.SortOrder;

            var facilityExists = await _db.Facilities.AnyAsync(f => f.Id == facilityId);
            if (!facilityExists) return BadRequest(new { message = "Facility not found." });

            var codeTaken = await _db.Carriers.AnyAsync(x =>
                x.FacilityId == facilityId &&
                x.CarrierCode == code &&
                x.Id != id);
            if (codeTaken) return Conflict(new { message = "Carrier code already exists." });

            entity.CarrierName = name;
            entity.CarrierCode = code;
            entity.FacilityId = facilityId;
            entity.SortOrder = sortOrder;

            await _db.SaveChangesAsync();
            return NoContent();
        }

        // DELETE /api/carriers/{id}
        [HttpDelete("{id:guid}")]
        public async Task<IActionResult> Delete(Guid id)
        {
            var entity = await _db.Carriers.FirstOrDefaultAsync(c => c.Id == id);
            if (entity == null) return NotFound(new { message = "Carrier not found." });

            _db.Carriers.Remove(entity);
            await _db.SaveChangesAsync();
            return NoContent();
        }
    }
}
