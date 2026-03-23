using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using YardManagementSystem.Data;
using YardManagementSystem.Dtos;
using YardManagementSystem.Models;

namespace YardManagementSystem.Controllers
{
    [ApiController]
    [Route("api/inspections")]
    public class InspectionsController : ControllerBase
    {
        private readonly ApplicationDbContext _db;
        public InspectionsController(ApplicationDbContext db) => _db = db;

        // GET: /api/inspections?search=&status=all&skip=0&take=6
        [HttpGet]
        public async Task<ActionResult<InspectionPagedResponseDto>> Get(
            [FromQuery] string? search = "",
            [FromQuery] string? status = "all",
            [FromQuery] int skip = 0,
            [FromQuery] int take = 6)
        {
            search ??= "";
            status ??= "all";
            if (take <= 0) take = 6;
            if (skip < 0) skip = 0;

            var q = _db.Inspections
                .AsNoTracking()
                .Include(x => x.Carrier)
                .Include(x => x.Facility)
                .Include(x => x.Location)
                .AsQueryable();

            if (!string.IsNullOrWhiteSpace(status) && status.ToLower() != "all")
                q = q.Where(x => x.Status == status);

            if (!string.IsNullOrWhiteSpace(search))
            {
                var s = search.Trim().ToLower();
                q = q.Where(x =>
                    (x.TrailerNumber ?? "").ToLower().Contains(s) ||
                    (x.Issue ?? "").ToLower().Contains(s) ||
                    (x.Area ?? "").ToLower().Contains(s) ||
                    (x.Carrier != null && (x.Carrier.CarrierName ?? "").ToLower().Contains(s)) ||
                    (x.Facility != null && (x.Facility.FacilityName ?? "").ToLower().Contains(s)) ||
                    (x.Location != null && (x.Location.LocationName ?? "").ToLower().Contains(s))
                );
            }

            var total = await q.CountAsync();

            var items = await q
                .OrderByDescending(x => x.Date)
                .ThenByDescending(x => x.Time)
                .Skip(skip)
                .Take(take)
                .Select(x => new InspectionListItemDto
                {
                    Id = x.Id,
                    Date = x.Date.ToString("yyyy-MM-dd"),
                    Time = x.Time.ToString("HH:mm"),

                    CarrierId = x.CarrierId,
                    CarrierName = x.Carrier != null ? x.Carrier.CarrierName : "",

                    TrailerNumber = x.TrailerNumber,

                    FacilityId = x.FacilityId,
                    FacilityName = x.Facility != null ? x.Facility.FacilityName : "",

                    LocationId = x.LocationId,
                    LocationName = x.Location != null ? x.Location.LocationName : "",

                    Issue = x.Issue,
                    Area = x.Area,

                    Status = x.Status,
                    Remarks = x.Remarks
                })
                .ToListAsync();

            return Ok(new InspectionPagedResponseDto
            {
                Total = total,
                Shown = Math.Min(skip + items.Count, total),
                Items = items
            });
        }

        // POST: /api/inspections
        [HttpPost]
        public async Task<ActionResult> Create([FromBody] InspectionUpsertDto dto)
        {
            if (dto == null) return BadRequest("Invalid payload.");

            var tn = (dto.TrailerNumber ?? "").Trim().ToUpper().Replace(" ", "");
            if (string.IsNullOrWhiteSpace(tn)) return BadRequest("TrailerNumber is required.");

            if (dto.CarrierId == Guid.Empty) return BadRequest("CarrierId is required.");
            if (dto.FacilityId == Guid.Empty) return BadRequest("FacilityId is required.");
            if (dto.LocationId == Guid.Empty) return BadRequest("LocationId is required.");

            if (!DateOnly.TryParse(dto.Date, out var date))
                return BadRequest("Invalid Date (use yyyy-MM-dd).");

            if (!TimeOnly.TryParse(dto.Time, out var time))
                return BadRequest("Invalid Time (use HH:mm).");

            // validate FK exists
            if (!await _db.Carriers.AnyAsync(c => c.Id == dto.CarrierId))
                return BadRequest("CarrierId not found.");
            if (!await _db.Facilities.AnyAsync(f => f.Id == dto.FacilityId))
                return BadRequest("FacilityId not found.");
            if (!await _db.Locations.AnyAsync(l => l.Id == dto.LocationId))
                return BadRequest("LocationId not found.");

            var entity = new Inspection
            {
                TrailerNumber = tn,
                Date = date,
                Time = time,
                CarrierId = dto.CarrierId,
                FacilityId = dto.FacilityId,
                LocationId = dto.LocationId,
                Issue = dto.Issue.Trim(),
                Area = dto.Area.Trim(),
                Status = string.IsNullOrWhiteSpace(dto.Status) ? "Pending" : dto.Status.Trim(),
                Remarks = string.IsNullOrWhiteSpace(dto.Remarks) ? null : dto.Remarks.Trim()
            };

            _db.Inspections.Add(entity);
            await _db.SaveChangesAsync();

            return Ok(new { entity.Id });
        }

        // PUT: /api/inspections/{id}
        [HttpPut("{id:int}")]
        public async Task<ActionResult> Update([FromRoute] int id, [FromBody] InspectionUpsertDto dto)
        {
            var entity = await _db.Inspections.FirstOrDefaultAsync(x => x.Id == id);
            if (entity == null) return NotFound();

            var tn = (dto.TrailerNumber ?? "").Trim().ToUpper().Replace(" ", "");
            if (string.IsNullOrWhiteSpace(tn)) return BadRequest("TrailerNumber is required.");

            if (!DateOnly.TryParse(dto.Date, out var date))
                return BadRequest("Invalid Date (use yyyy-MM-dd).");

            if (!TimeOnly.TryParse(dto.Time, out var time))
                return BadRequest("Invalid Time (use HH:mm).");

            entity.TrailerNumber = tn;
            entity.Date = date;
            entity.Time = time;
            entity.CarrierId = dto.CarrierId;
            entity.FacilityId = dto.FacilityId;
            entity.LocationId = dto.LocationId;
            entity.Issue = dto.Issue.Trim();
            entity.Area = dto.Area.Trim();
            entity.Status = string.IsNullOrWhiteSpace(dto.Status) ? "Pending" : dto.Status.Trim();
            entity.Remarks = string.IsNullOrWhiteSpace(dto.Remarks) ? null : dto.Remarks.Trim();

            await _db.SaveChangesAsync();
            return NoContent();
        }

        // DELETE: /api/inspections/{id}
        [HttpDelete("{id:int}")]
        public async Task<ActionResult> Delete([FromRoute] int id)
        {
            var entity = await _db.Inspections.FirstOrDefaultAsync(x => x.Id == id);
            if (entity == null) return NotFound();

            _db.Inspections.Remove(entity);
            await _db.SaveChangesAsync();
            return NoContent();
        }
    }
}