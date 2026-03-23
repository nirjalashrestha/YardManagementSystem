using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using YardManagementSystem.Data;
using YardManagementSystem.Dtos;
using YardManagementSystem.Models;

namespace YardManagementSystem.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class TrailerTypesController : ControllerBase
    {
        private readonly ApplicationDbContext _db;
        public TrailerTypesController(ApplicationDbContext db) => _db = db;

        // GET /api/trailertypes?search=&skip=0&take=6
        [HttpGet]
        public async Task<ActionResult<PagedResult<TrailerTypeItemDto>>> Get(
            [FromQuery] string? search = "",
            [FromQuery] Guid? facilityId = null,
            [FromQuery] int skip = 0,
            [FromQuery] int take = 6)
        {
            if (skip < 0) skip = 0;
            if (take <= 0) take = 6;
            if (take > 100) take = 100;

            var q = _db.TrailerTypes
                .AsNoTracking()
                .Include(t => t.Facility)
                .AsQueryable();

            if (facilityId.HasValue && facilityId.Value != Guid.Empty)
                q = q.Where(t => t.FacilityId == facilityId.Value);

            var s = (search ?? "").Trim().ToLower();
            if (!string.IsNullOrWhiteSpace(s))
            {
                q = q.Where(t =>
                    t.TrailerTypeName.ToLower().Contains(s) ||
                    t.TrailerTypeCode.ToLower().Contains(s)
                );
            }

            var total = await q.CountAsync();

            var items = await q
                .OrderBy(t => t.TrailerTypeName)
                .Skip(skip)
                .Take(take)
                .Select(t => new TrailerTypeItemDto
                {
                    Id = t.Id,
                    TrailerTypeName = t.TrailerTypeName,
                    TrailerTypeCode = t.TrailerTypeCode,
                    FacilityId = t.FacilityId,
                    FacilityName = t.Facility != null ? t.Facility.FacilityName : "",
                    Length = t.Length,
                    Status = t.Status,
                    SortOrder = t.SortOrder
                })
                .ToArrayAsync();

            var shown = Math.Min(skip + items.Length, total);

            return Ok(new PagedResult<TrailerTypeItemDto>
            {
                Total = total,
                Shown = shown,
                Items = items
            });
        }

        // POST /api/trailertypes
        [HttpPost]
        public async Task<ActionResult<TrailerTypeItemDto>> Create([FromBody] TrailerTypeCreateUpdateDto dto)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);

            var name = dto.TrailerTypeName.Trim();
            var code = dto.TrailerTypeCode.Trim().ToUpper();
            var facilityId = dto.FacilityId;
            var status = (dto.Status ?? "ACTIVE").Trim().ToUpper();
            var sortOrder = dto.SortOrder <= 0 ? 1 : dto.SortOrder;
            var length = dto.Length;

            var facility = await _db.Facilities.AsNoTracking().FirstOrDefaultAsync(f => f.Id == facilityId);
            if (facility == null) return BadRequest(new { message = "Facility not found." });

            var exists = await _db.TrailerTypes.AnyAsync(x =>
                x.FacilityId == facilityId &&
                x.TrailerTypeCode == code);
            if (exists) return Conflict(new { message = "Trailer type code already exists." });

            var entity = new TrailerType
            {
                Id = Guid.NewGuid(),
                TrailerTypeName = name,
                TrailerTypeCode = code,
                FacilityId = facilityId,
                Length = length,
                Status = status,
                SortOrder = sortOrder
            };

            _db.TrailerTypes.Add(entity);
            await _db.SaveChangesAsync();

            return Ok(new TrailerTypeItemDto
            {
                Id = entity.Id,
                TrailerTypeName = entity.TrailerTypeName,
                TrailerTypeCode = entity.TrailerTypeCode,
                FacilityId = entity.FacilityId,
                FacilityName = facility.FacilityName,
                Length = entity.Length,
                Status = entity.Status,
                SortOrder = entity.SortOrder
            });
        }

        // PUT /api/trailertypes/{id}
        [HttpPut("{id:guid}")]
        public async Task<IActionResult> Update(Guid id, [FromBody] TrailerTypeCreateUpdateDto dto)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);

            var entity = await _db.TrailerTypes.FirstOrDefaultAsync(t => t.Id == id);
            if (entity == null) return NotFound(new { message = "Trailer type not found." });

            var name = dto.TrailerTypeName.Trim();
            var code = dto.TrailerTypeCode.Trim().ToUpper();
            var facilityId = dto.FacilityId;
            var status = (dto.Status ?? "ACTIVE").Trim().ToUpper();
            var sortOrder = dto.SortOrder <= 0 ? 1 : dto.SortOrder;
            var length = dto.Length;

            var facilityExists = await _db.Facilities.AnyAsync(f => f.Id == facilityId);
            if (!facilityExists) return BadRequest(new { message = "Facility not found." });

            var codeTaken = await _db.TrailerTypes.AnyAsync(x =>
                x.FacilityId == facilityId &&
                x.TrailerTypeCode == code &&
                x.Id != id);
            if (codeTaken) return Conflict(new { message = "Trailer type code already exists." });

            entity.TrailerTypeName = name;
            entity.TrailerTypeCode = code;
            entity.FacilityId = facilityId;
            entity.Length = length;
            entity.Status = status;
            entity.SortOrder = sortOrder;

            await _db.SaveChangesAsync();
            return NoContent();
        }

        // DELETE /api/trailertypes/{id}
        [HttpDelete("{id:guid}")]
        public async Task<IActionResult> Delete(Guid id)
        {
            var entity = await _db.TrailerTypes.FirstOrDefaultAsync(t => t.Id == id);
            if (entity == null) return NotFound(new { message = "Trailer type not found." });

            _db.TrailerTypes.Remove(entity);
            await _db.SaveChangesAsync();
            return NoContent();
        }
    }
}