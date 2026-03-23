using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using YardManagementSystem.Data;
using YardManagementSystem.Dtos;
using YardManagementSystem.Models;

namespace YardManagementSystem.Controllers
{
    [ApiController]
    [Route("api/goods")]
    public class GoodsController : ControllerBase
    {
        private readonly ApplicationDbContext _db;
        public GoodsController(ApplicationDbContext db) => _db = db;

        [HttpGet]
        public async Task<ActionResult<PagedResultDto<GoodsItemDto>>> Get(
            [FromQuery] string? search = "",
            [FromQuery] Guid? facilityId = null,
            [FromQuery] int skip = 0,
            [FromQuery] int take = 6)
        {
            if (skip < 0) skip = 0;
            if (take < 1) take = 6;
            if (take > 100) take = 100;

            var q = _db.Goods
                .AsNoTracking()
                .Include(x => x.Facility)
                .AsQueryable();

            if (facilityId.HasValue && facilityId.Value != Guid.Empty)
                q = q.Where(x => x.FacilityId == facilityId.Value);

            var s = (search ?? "").Trim().ToLower();
            if (!string.IsNullOrWhiteSpace(s))
            {
                q = q.Where(x =>
                    x.GoodsName.ToLower().Contains(s) ||
                    x.GoodsCode.ToLower().Contains(s) ||
                    (x.Facility != null && x.Facility.FacilityName.ToLower().Contains(s)));
            }

            var total = await q.CountAsync();

            var items = await q
                .OrderBy(x => x.SortOrder)
                .ThenBy(x => x.GoodsName)
                .Skip(skip)
                .Take(take)
                .Select(x => new GoodsItemDto
                {
                    Id = x.Id,
                    FacilityId = x.FacilityId,
                    FacilityName = x.Facility != null ? x.Facility.FacilityName : "",
                    GoodsName = x.GoodsName,
                    GoodsCode = x.GoodsCode,
                    Weight = x.Weight,       // new
                    Quantity = x.Quantity,   // new
                    Status = x.Status,
                    SortOrder = x.SortOrder,
                    CreatedAt = x.CreatedAt,
                    UpdatedAt = x.UpdatedAt
                })
                .ToListAsync();

            return Ok(new PagedResultDto<GoodsItemDto>
            {
                Total = total,
                Shown = Math.Min(skip + items.Count, total),
                Items = items
            });
        }

        [HttpPost]
        public async Task<ActionResult<GoodsItemDto>> Create([FromBody] GoodsCreateUpdateDto dto)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);

            var name = (dto.GoodsName ?? "").Trim();
            var code = (dto.GoodsCode ?? "").Trim().ToUpper();
            var status = (dto.Status ?? "ACTIVE").Trim().ToUpper();
            var sortOrder = dto.SortOrder <= 0 ? 1 : dto.SortOrder;

            if (string.IsNullOrWhiteSpace(name))
                return BadRequest(new { message = "Goods name is required." });

            if (string.IsNullOrWhiteSpace(code))
                return BadRequest(new { message = "Goods code is required." });

            if (status != "ACTIVE" && status != "INACTIVE")
                return BadRequest(new { message = "Status must be ACTIVE or INACTIVE." });

            if (dto.Weight.HasValue && dto.Weight.Value < 0)
                return BadRequest(new { message = "Weight cannot be negative." });

            if (dto.Quantity.HasValue && dto.Quantity.Value < 0)
                return BadRequest(new { message = "Quantity cannot be negative." });

            var facility = await _db.Facilities.AsNoTracking().FirstOrDefaultAsync(f => f.Id == dto.FacilityId);
            if (facility == null)
                return BadRequest(new { message = "Facility not found." });

            var exists = await _db.Goods.AnyAsync(x =>
                x.FacilityId == dto.FacilityId &&
                x.GoodsCode.ToLower() == code.ToLower());

            if (exists)
                return Conflict(new { message = "Goods code already exists in this facility." });

            var entity = new Goods
            {
                Id = Guid.NewGuid(),
                FacilityId = dto.FacilityId,
                GoodsName = name,
                GoodsCode = code,
                Weight = dto.Weight,       // new
                Quantity = dto.Quantity,   // new
                Status = status,
                SortOrder = sortOrder,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            _db.Goods.Add(entity);
            await _db.SaveChangesAsync();

            return Ok(new GoodsItemDto
            {
                Id = entity.Id,
                FacilityId = entity.FacilityId,
                FacilityName = facility.FacilityName,
                GoodsName = entity.GoodsName,
                GoodsCode = entity.GoodsCode,
                Weight = entity.Weight,       // new
                Quantity = entity.Quantity,   // new
                Status = entity.Status,
                SortOrder = entity.SortOrder,
                CreatedAt = entity.CreatedAt,
                UpdatedAt = entity.UpdatedAt
            });
        }

        [HttpPut("{id:guid}")]
        public async Task<IActionResult> Update(Guid id, [FromBody] GoodsCreateUpdateDto dto)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);

            var entity = await _db.Goods.FirstOrDefaultAsync(x => x.Id == id);
            if (entity == null) return NotFound(new { message = "Goods not found." });

            var name = (dto.GoodsName ?? "").Trim();
            var code = (dto.GoodsCode ?? "").Trim().ToUpper();
            var status = (dto.Status ?? "ACTIVE").Trim().ToUpper();
            var sortOrder = dto.SortOrder <= 0 ? 1 : dto.SortOrder;

            if (string.IsNullOrWhiteSpace(name))
                return BadRequest(new { message = "Goods name is required." });

            if (string.IsNullOrWhiteSpace(code))
                return BadRequest(new { message = "Goods code is required." });

            if (status != "ACTIVE" && status != "INACTIVE")
                return BadRequest(new { message = "Status must be ACTIVE or INACTIVE." });

            if (dto.Weight.HasValue && dto.Weight.Value < 0)
                return BadRequest(new { message = "Weight cannot be negative." });

            if (dto.Quantity.HasValue && dto.Quantity.Value < 0)
                return BadRequest(new { message = "Quantity cannot be negative." });

            var facilityExists = await _db.Facilities.AnyAsync(f => f.Id == dto.FacilityId);
            if (!facilityExists)
                return BadRequest(new { message = "Facility not found." });

            var exists = await _db.Goods.AnyAsync(x =>
                x.FacilityId == dto.FacilityId &&
                x.GoodsCode.ToLower() == code.ToLower() &&
                x.Id != id);

            if (exists)
                return Conflict(new { message = "Goods code already exists in this facility." });

            entity.FacilityId = dto.FacilityId;
            entity.GoodsName = name;
            entity.GoodsCode = code;
            entity.Weight = dto.Weight;       // new
            entity.Quantity = dto.Quantity;   // new
            entity.Status = status;
            entity.SortOrder = sortOrder;
            entity.UpdatedAt = DateTime.UtcNow;

            await _db.SaveChangesAsync();
            return NoContent();
        }

        [HttpDelete("{id:guid}")]
        public async Task<IActionResult> Delete(Guid id)
        {
            var entity = await _db.Goods.FirstOrDefaultAsync(x => x.Id == id);
            if (entity == null) return NotFound(new { message = "Goods not found." });

            _db.Goods.Remove(entity);
            await _db.SaveChangesAsync();
            return NoContent();
        }
    }
}
