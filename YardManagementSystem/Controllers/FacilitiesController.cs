using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using YardManagementSystem.Data;
using YardManagementSystem.Dtos;
using YardManagementSystem.Models;

namespace YardManagementSystem.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class FacilitiesController : ControllerBase
    {
        private readonly ApplicationDbContext _db;

        public FacilitiesController(ApplicationDbContext db)
        {
            _db = db;
        }

        // GET /api/facilities?search=&skip=0&take=6
        [HttpGet]
        public async Task<ActionResult<PagedResult<FacilityItemDto>>> GetFacilities(
            [FromQuery] string? search = "",
            [FromQuery] int skip = 0,
            [FromQuery] int take = 6)
        {
            if (skip < 0) skip = 0;
            if (take <= 0) take = 6;
            if (take > 100) take = 100;

            var q = _db.Facilities.AsNoTracking();

            var s = (search ?? "").Trim();
            if (!string.IsNullOrWhiteSpace(s))
            {
                var low = s.ToLower();
                q = q.Where(x =>
                    x.FacilityName.ToLower().Contains(low) ||
                    x.FacilityCode.ToLower().Contains(low) ||
                    x.Type.ToLower().Contains(low));
            }

            var total = await q.CountAsync();

            var items = await q
                .OrderBy(x => x.FacilityName)
                .Skip(skip)
                .Take(take)
                .Select(x => new FacilityItemDto
                {
                    Id = x.Id,
                    FacilityName = x.FacilityName,
                    FacilityCode = x.FacilityCode,
                    Type = x.Type
                })
                .ToArrayAsync();

            var shown = Math.Min(skip + items.Length, total);

            return Ok(new PagedResult<FacilityItemDto>
            {
                Total = total,
                Shown = shown,
                Items = items
            });
        }

        // POST /api/facilities
        [HttpPost]
        public async Task<ActionResult<FacilityItemDto>> Create([FromBody] FacilityCreateUpdateDto dto)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);

            var name = (dto.FacilityName ?? "").Trim();
            var code = (dto.FacilityCode ?? "").Trim().ToUpperInvariant();
            var type = (dto.Type ?? "").Trim();

            if (string.IsNullOrWhiteSpace(name) || string.IsNullOrWhiteSpace(code) || string.IsNullOrWhiteSpace(type))
                return BadRequest(new { message = "FacilityName, FacilityCode, and Type are required." });

            var exists = await _db.Facilities.AnyAsync(x => x.FacilityCode == code);
            if (exists) return Conflict(new { message = "Facility code already exists." });

            var entity = new Facility
            {
                Id = Guid.NewGuid(),
                FacilityName = name,
                FacilityCode = code,
                Type = type
            };

            _db.Facilities.Add(entity);
            await _db.SaveChangesAsync();

            return Ok(new FacilityItemDto
            {
                Id = entity.Id,
                FacilityName = entity.FacilityName,
                FacilityCode = entity.FacilityCode,
                Type = entity.Type
            });
        }

        // PUT /api/facilities/{id}
        [HttpPut("{id:guid}")]
        public async Task<IActionResult> Update(Guid id, [FromBody] FacilityCreateUpdateDto dto)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);

            var entity = await _db.Facilities.FirstOrDefaultAsync(x => x.Id == id);
            if (entity == null) return NotFound(new { message = "Facility not found." });

            var name = (dto.FacilityName ?? "").Trim();
            var code = (dto.FacilityCode ?? "").Trim().ToUpperInvariant();
            var type = (dto.Type ?? "").Trim();

            if (string.IsNullOrWhiteSpace(name) || string.IsNullOrWhiteSpace(code) || string.IsNullOrWhiteSpace(type))
                return BadRequest(new { message = "FacilityName, FacilityCode, and Type are required." });

            var codeTaken = await _db.Facilities.AnyAsync(x => x.FacilityCode == code && x.Id != id);
            if (codeTaken) return Conflict(new { message = "Facility code already exists." });

            entity.FacilityName = name;
            entity.FacilityCode = code;
            entity.Type = type;

            await _db.SaveChangesAsync();
            return NoContent();
        }

        // DELETE /api/facilities/{id}
        [HttpDelete("{id:guid}")]
        public async Task<IActionResult> Delete(Guid id)
        {
            var entity = await _db.Facilities.FirstOrDefaultAsync(x => x.Id == id);
            if (entity == null) return NotFound(new { message = "Facility not found." });

            var dependencies = new List<string>();

            // Add checks for tables that reference FacilityId
            if (await _db.Locations.AnyAsync(x => x.FacilityId == id)) dependencies.Add("Locations");
            if (await _db.Carriers.AnyAsync(x => x.FacilityId == id)) dependencies.Add("Carriers");
            if (await _db.TrailerTypes.AnyAsync(x => x.FacilityId == id)) dependencies.Add("TrailerTypes");
            if (await _db.Vehicles.AnyAsync(x => x.FacilityId == id)) dependencies.Add("Vehicles");
            if (await _db.Arrivals.AnyAsync(x => x.FacilityId == id)) dependencies.Add("Arrivals");
            if (await _db.Departures.AnyAsync(x => x.FacilityId == id)) dependencies.Add("Departures");
            if (await _db.YardMoves.AnyAsync(x => x.FacilityId == id)) dependencies.Add("YardMoves");
            if (await _db.YardChecks.AnyAsync(x => x.FacilityId == id)) dependencies.Add("YardChecks");
            if (await _db.Inspections.AnyAsync(x => x.FacilityId == id)) dependencies.Add("Inspections");
            if (await _db.Gates.AnyAsync(x => x.FacilityId == id)) dependencies.Add("Gates");
            if (await _db.Docks.AnyAsync(x => x.FacilityId == id)) dependencies.Add("Docks");
            if (await _db.Goods.AnyAsync(x => x.FacilityId == id)) dependencies.Add("Goods");
            if (await _db.ParkingSlots.AnyAsync(x => x.FacilityId == id)) dependencies.Add("ParkingSlots");

            if (dependencies.Count > 0)
            {
                return BadRequest(new
                {
                    message = $"Cannot delete facility. It is referenced by: {string.Join(", ", dependencies)}."
                });
            }

            _db.Facilities.Remove(entity);
            await _db.SaveChangesAsync();

            return NoContent();
        }
    }
}
