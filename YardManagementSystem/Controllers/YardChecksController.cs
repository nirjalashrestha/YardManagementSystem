using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using YardManagementSystem.Data;
using YardManagementSystem.Dtos;
using YardManagementSystem.Models;

namespace YardManagementSystem.Controllers
{
    [ApiController]
    [Route("api/yardchecks")]
    [Authorize]
    public class YardChecksController : ControllerBase
    {
        private static readonly HashSet<string> AllowedStatuses =
            new(StringComparer.OrdinalIgnoreCase) { "Pending", "In Progress", "Completed", "Cancelled" };

        private readonly ApplicationDbContext _db;
        private readonly UserManager<ApplicationUsers> _userManager;

        public YardChecksController(ApplicationDbContext db, UserManager<ApplicationUsers> userManager)
        {
            _db = db;
            _userManager = userManager;
        }

        private async Task<string> ResolveActorAsync()
        {
            var userId = User?.FindFirstValue(ClaimTypes.NameIdentifier);
            if (!string.IsNullOrWhiteSpace(userId))
            {
                var u = await _userManager.FindByIdAsync(userId);
                if (u != null)
                {
                    var fullName = (u.FullName ?? "").Trim();
                    var role = (u.AppRole ?? "").Trim();

                    if (!string.IsNullOrWhiteSpace(fullName) && !string.IsNullOrWhiteSpace(role)) return $"{fullName} ({role})";
                    if (!string.IsNullOrWhiteSpace(fullName)) return fullName;
                    if (!string.IsNullOrWhiteSpace(role)) return role;
                }
            }

            var claimName = User?.FindFirst("fullName")?.Value ?? User?.FindFirst(ClaimTypes.Name)?.Value ?? User?.Identity?.Name;
            var claimRole = User?.FindFirst(ClaimTypes.Role)?.Value ?? User?.FindFirst("role")?.Value;

            if (!string.IsNullOrWhiteSpace(claimName) && !string.IsNullOrWhiteSpace(claimRole)) return $"{claimName} ({claimRole})";
            if (!string.IsNullOrWhiteSpace(claimName)) return claimName;
            if (!string.IsNullOrWhiteSpace(claimRole)) return claimRole;

            return "system";
        }

        private async Task<Guid?> ResolveLatestArrivalLocationId(Guid facilityId, string trailerNo)
        {
            var t = (trailerNo ?? "").Trim().ToUpperInvariant();
            if (string.IsNullOrWhiteSpace(t)) return null;

            return await _db.Arrivals
                .AsNoTracking()
                .Where(a => a.FacilityId == facilityId &&
                            a.LocationId != null &&
                            (a.TrailerNumber ?? "").ToUpper() == t)
                .OrderByDescending(a => a.CreatedAtUtc)
                .Select(a => a.LocationId)
                .FirstOrDefaultAsync();
        }

        [HttpGet]
        public async Task<ActionResult<PagedResultDto<YardCheckItemDto>>> Get(
            [FromQuery] string? search = "",
            [FromQuery] string? status = "",
            [FromQuery] Guid? facilityId = null,
            [FromQuery] int skip = 0,
            [FromQuery] int take = 6)
        {
            if (skip < 0) skip = 0;
            if (take < 1) take = 6;
            if (take > 100) take = 100;

            var q = _db.YardChecks
                .AsNoTracking()
                .Include(x => x.Facility)
                .Include(x => x.Location)
                .AsQueryable();

            if (facilityId.HasValue && facilityId.Value != Guid.Empty)
                q = q.Where(x => x.FacilityId == facilityId.Value);

            if (!string.IsNullOrWhiteSpace(status))
                q = q.Where(x => x.Status.ToUpper() == status.Trim().ToUpper());

            var s = (search ?? "").Trim().ToLower();
            if (!string.IsNullOrWhiteSpace(s))
            {
                q = q.Where(x =>
                    x.TrailerNumber.ToLower().Contains(s) ||
                    (x.Facility != null && x.Facility.FacilityName.ToLower().Contains(s)) ||
                    (x.Location != null && x.Location.LocationName.ToLower().Contains(s)));
            }

            var total = await q.CountAsync();

            var items = await q
                .OrderByDescending(x => x.Date).ThenByDescending(x => x.Time)
                .Skip(skip).Take(take)
                .Select(x => new YardCheckItemDto
                {
                    Id = x.Id,
                    Date = x.Date,
                    Time = x.Time,
                    TrailerNumber = x.TrailerNumber,
                    FacilityId = x.FacilityId,
                    FacilityName = x.Facility != null ? x.Facility.FacilityName : "",
                    LocationId = x.LocationId,
                    LocationName = x.Location != null ? x.Location.LocationName : null,
                    Status = x.Status,
                    CreatedBy = x.CreatedBy,
                    CreatedAtUtc = x.CreatedAtUtc,
                    UpdatedAtUtc = x.UpdatedAtUtc
                })
                .ToListAsync();

            return Ok(new PagedResultDto<YardCheckItemDto>
            {
                Total = total,
                Shown = Math.Min(skip + items.Count, total),
                Items = items
            });
        }

        [HttpPost]
        public async Task<ActionResult> Create([FromBody] YardCheckCreateUpdateDto dto)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);

            var trailer = (dto.TrailerNumber ?? "").Trim().ToUpperInvariant();
            if (string.IsNullOrWhiteSpace(trailer))
                return BadRequest(new { message = "TrailerNumber is required." });

            if (!AllowedStatuses.Contains(dto.Status ?? ""))
                return BadRequest(new { message = "Invalid status." });

            var facilityExists = await _db.Facilities.AsNoTracking().AnyAsync(f => f.Id == dto.FacilityId);
            if (!facilityExists) return BadRequest(new { message = "Facility not found." });

            Guid? locId = dto.LocationId;
            if (!locId.HasValue || locId.Value == Guid.Empty)
                locId = await ResolveLatestArrivalLocationId(dto.FacilityId, trailer);

            if (!locId.HasValue || locId.Value == Guid.Empty)
                return BadRequest(new { message = "Location not found from latest arrival for this trailer." });

            var locOk = await _db.Locations.AsNoTracking().AnyAsync(l => l.Id == locId.Value && l.FacilityId == dto.FacilityId);
            if (!locOk) return BadRequest(new { message = "Location invalid for facility." });

            var actor = await ResolveActorAsync();

            var entity = new YardCheck
            {
                Id = Guid.NewGuid(),
                Date = dto.Date.Trim(),
                Time = dto.Time.Trim(),
                TrailerNumber = trailer,
                FacilityId = dto.FacilityId,
                LocationId = locId.Value,
                Status = (dto.Status ?? "Pending").Trim(),
                CreatedBy = actor,
                CreatedAtUtc = DateTime.UtcNow,
                UpdatedAtUtc = DateTime.UtcNow
            };

            _db.YardChecks.Add(entity);
            await _db.SaveChangesAsync();
            return Ok(new { id = entity.Id });
        }

        [HttpPut("{id:guid}")]
        public async Task<IActionResult> Update(Guid id, [FromBody] YardCheckCreateUpdateDto dto)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);

            var entity = await _db.YardChecks.FirstOrDefaultAsync(x => x.Id == id);
            if (entity == null) return NotFound(new { message = "Yard check not found." });

            var trailer = (dto.TrailerNumber ?? "").Trim().ToUpperInvariant();
            if (string.IsNullOrWhiteSpace(trailer))
                return BadRequest(new { message = "TrailerNumber is required." });

            if (!AllowedStatuses.Contains(dto.Status ?? ""))
                return BadRequest(new { message = "Invalid status." });

            var facilityExists = await _db.Facilities.AsNoTracking().AnyAsync(f => f.Id == dto.FacilityId);
            if (!facilityExists) return BadRequest(new { message = "Facility not found." });

            Guid? locId = dto.LocationId;
            if (!locId.HasValue || locId.Value == Guid.Empty)
                locId = await ResolveLatestArrivalLocationId(dto.FacilityId, trailer);

            if (!locId.HasValue || locId.Value == Guid.Empty)
                return BadRequest(new { message = "Location not found from latest arrival for this trailer." });

            var locOk = await _db.Locations.AsNoTracking().AnyAsync(l => l.Id == locId.Value && l.FacilityId == dto.FacilityId);
            if (!locOk) return BadRequest(new { message = "Location invalid for facility." });

            entity.Date = dto.Date.Trim();
            entity.Time = dto.Time.Trim();
            entity.TrailerNumber = trailer;
            entity.FacilityId = dto.FacilityId;
            entity.LocationId = locId.Value;
            entity.Status = string.IsNullOrWhiteSpace(dto.Status) ? "Pending" : dto.Status.Trim();
            entity.UpdatedAtUtc = DateTime.UtcNow;

            // IMPORTANT: do not modify CreatedBy on update

            await _db.SaveChangesAsync();
            return NoContent();
        }

        [HttpDelete("{id:guid}")]
        public async Task<IActionResult> Delete(Guid id)
        {
            var entity = await _db.YardChecks.FirstOrDefaultAsync(x => x.Id == id);
            if (entity == null) return NotFound(new { message = "Yard check not found." });

            _db.YardChecks.Remove(entity);
            await _db.SaveChangesAsync();
            return NoContent();
        }
    }
}
