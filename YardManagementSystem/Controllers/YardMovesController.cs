using System.Security.Claims;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using YardManagementSystem.Data;
using YardManagementSystem.Dtos;
using YardManagementSystem.Models;

namespace YardManagementSystem.Controllers
{
    [ApiController]
    [Route("api/yard-moves")]
    public class YardMovesController : ControllerBase
    {
        private static readonly HashSet<string> AllowedStatuses =
            new(StringComparer.OrdinalIgnoreCase) { "PENDING", "IN_PROGRESS", "COMPLETED", "CANCELLED" };

        private readonly ApplicationDbContext _db;
        public YardMovesController(ApplicationDbContext db) => _db = db;

        private static string NormalizeStatus(string? status)
            => string.IsNullOrWhiteSpace(status) ? "PENDING" : status.Trim().ToUpperInvariant();

        private string ResolveActor()
        {
            var fullName =
                User?.FindFirst("fullName")?.Value ??
                User?.FindFirst(ClaimTypes.Name)?.Value ??
                User?.FindFirst("name")?.Value ??
                User?.Identity?.Name;

            var role =
                User?.FindFirst(ClaimTypes.Role)?.Value ??
                User?.FindFirst("role")?.Value;

            if (!string.IsNullOrWhiteSpace(fullName) && !string.IsNullOrWhiteSpace(role))
                return $"{fullName} ({role})";

            if (!string.IsNullOrWhiteSpace(fullName)) return fullName;
            if (!string.IsNullOrWhiteSpace(role)) return role;

            return "system";
        }

        private async Task<Guid?> ResolveLatestArrivalLocationId(Guid facilityId, string trailerNo)
        {
            var t = (trailerNo ?? "").Trim().ToUpperInvariant();
            if (string.IsNullOrWhiteSpace(t)) return null;

            return await _db.Arrivals
                .AsNoTracking()
                .Where(a =>
                    a.FacilityId == facilityId &&
                    a.LocationId != null &&
                    (a.TrailerNumber ?? "").ToUpper() == t)
                .OrderByDescending(a => a.CreatedAtUtc)
                .Select(a => a.LocationId)
                .FirstOrDefaultAsync();
        }

        private async Task ApplyCompletedMoveToArrivalAsync(Guid facilityId, string trailerNo, Guid toLocationId)
        {
            var t = (trailerNo ?? "").Trim().ToUpperInvariant();
            if (string.IsNullOrWhiteSpace(t)) return;

            var arrival = await _db.Arrivals
                .Where(a =>
                    a.FacilityId == facilityId &&
                    (a.TrailerNumber ?? "").ToUpper() == t &&
                    (a.Status ?? "").ToLower() != "rejected")
                .OrderByDescending(a => a.CreatedAtUtc)
                .FirstOrDefaultAsync();

            if (arrival == null) return;

            arrival.LocationId = toLocationId;
        }

        [HttpGet]
        public async Task<ActionResult<PagedResultDto<YardMoveItemDto>>> Get(
            [FromQuery] string? search = "",
            [FromQuery] Guid? facilityId = null,
            [FromQuery] string? status = "",
            [FromQuery] int skip = 0,
            [FromQuery] int take = 6)
        {
            if (skip < 0) skip = 0;
            if (take < 1) take = 6;
            if (take > 100) take = 100;

            var q = _db.YardMoves
                .AsNoTracking()
                .Include(x => x.Facility)
                .Include(x => x.Carrier)
                .Include(x => x.FromLocation)
                .Include(x => x.ToLocation)
                .AsQueryable();

            if (facilityId.HasValue && facilityId.Value != Guid.Empty)
                q = q.Where(x => x.FacilityId == facilityId.Value);

            var rawStatus = (status ?? "").Trim();
            if (!string.IsNullOrWhiteSpace(rawStatus))
            {
                var sStatus = NormalizeStatus(rawStatus);
                q = q.Where(x => x.Status.ToUpper() == sStatus);
            }

            var s = (search ?? "").Trim().ToLower();
            if (!string.IsNullOrWhiteSpace(s))
            {
                q = q.Where(x =>
                    x.TrailerNumber.ToLower().Contains(s) ||
                    (x.Carrier != null && x.Carrier.CarrierName.ToLower().Contains(s)) ||
                    (x.FromLocation != null && x.FromLocation.LocationName.ToLower().Contains(s)) ||
                    (x.ToLocation != null && x.ToLocation.LocationName.ToLower().Contains(s)));
            }

            var items = await q
                .OrderByDescending(x => x.MoveDateTime)
                .Select(x => new YardMoveItemDto
                {
                    Id = x.Id,
                    VehicleId = x.VehicleId,
                    TrailerNumber = x.TrailerNumber,
                    FacilityId = x.FacilityId,
                    FacilityName = x.Facility != null ? x.Facility.FacilityName : "",
                    CarrierId = x.CarrierId,
                    CarrierName = x.Carrier != null ? x.Carrier.CarrierName : null,
                    FromLocationId = x.FromLocationId,
                    FromLocationName = x.FromLocation != null ? x.FromLocation.LocationName : null,
                    FromLocationType = x.FromLocation != null ? x.FromLocation.LocationType : null,
                    ToLocationId = x.ToLocationId,
                    ToLocationName = x.ToLocation != null ? x.ToLocation.LocationName : "",
                    ToLocationType = x.ToLocation != null ? x.ToLocation.LocationType : null,
                    MoveDateTime = x.MoveDateTime,
                    Status = x.Status,
                    Remarks = x.Remarks,
                    CreatedAt = x.CreatedAt,
                    UpdatedAt = x.UpdatedAt,
                    CreatedBy = x.CreatedBy,
                    UpdatedBy = x.UpdatedBy,
                    RefId = null
                })
                .ToListAsync();

            var facilityIds = items.Select(i => i.FacilityId).Distinct().ToList();
            var trailerNumbers = items
                .Select(i => (i.TrailerNumber ?? "").Trim().ToUpperInvariant())
                .Where(t => !string.IsNullOrWhiteSpace(t))
                .Distinct()
                .ToList();

            if (facilityIds.Count > 0 && trailerNumbers.Count > 0)
            {
                var refs = await _db.Arrivals
                    .AsNoTracking()
                    .Where(a =>
                        facilityIds.Contains(a.FacilityId) &&
                        trailerNumbers.Contains((a.TrailerNumber ?? "").Trim().ToUpper()))
                    .Select(a => new
                    {
                        a.FacilityId,
                        TrailerNumber = (a.TrailerNumber ?? "").Trim().ToUpper(),
                        RefId = a.ActivityId,
                        a.CreatedAtUtc
                    })
                    .ToListAsync();

                var latestRefByKey = refs
                    .GroupBy(x => $"{x.FacilityId:N}|{x.TrailerNumber}")
                    .ToDictionary(
                        g => g.Key,
                        g => g.OrderByDescending(x => x.CreatedAtUtc).Select(x => x.RefId).FirstOrDefault()
                    );

                foreach (var item in items)
                {
                    var tn = (item.TrailerNumber ?? "").Trim().ToUpperInvariant();
                    var key = $"{item.FacilityId:N}|{tn}";
                    if (latestRefByKey.TryGetValue(key, out var refId))
                        item.RefId = refId;
                }
            }

            var consumedRefSet = (await _db.Departures
                    .AsNoTracking()
                    .Where(d =>
                        d.RefYardMoveId != null &&
                        d.RefYardMoveId != "" &&
                        (d.LoadingStatus ?? "").ToUpper() == "COMPLETED" &&
                        (d.FinalStatus ?? "").ToUpper() == "EXITED")
                    .Select(d => d.RefYardMoveId!)
                    .ToListAsync())
                .Select(x => x.Trim().ToUpperInvariant())
                .Where(x => !string.IsNullOrWhiteSpace(x))
                .ToHashSet();

            if (consumedRefSet.Count > 0)
            {
                items = items
                    .Where(item =>
                    {
                        var idD = item.Id.ToString("D").ToUpperInvariant();
                        var idN = item.Id.ToString("N").ToUpperInvariant();
                        var refId = (item.RefId ?? "").Trim().ToUpperInvariant();

                        return !consumedRefSet.Contains(idD) &&
                               !consumedRefSet.Contains(idN) &&
                               (string.IsNullOrWhiteSpace(refId) || !consumedRefSet.Contains(refId));
                    })
                    .ToList();
            }

            var total = items.Count;
            items = items
                .Skip(skip)
                .Take(take)
                .ToList();

            return Ok(new PagedResultDto<YardMoveItemDto>
            {
                Total = total,
                Shown = Math.Min(skip + items.Count, total),
                Items = items
            });
        }

        [HttpPost]
        public async Task<ActionResult> Create([FromBody] YardMoveCreateUpdateDto dto)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);

            var trailerNo = (dto.TrailerNumber ?? "").Trim().ToUpperInvariant();
            var status = NormalizeStatus(dto.Status);

            if (string.IsNullOrWhiteSpace(trailerNo))
                return BadRequest(new { message = "Trailer number is required." });

            if (!AllowedStatuses.Contains(status))
                return BadRequest(new { message = "Status must be PENDING, IN_PROGRESS, COMPLETED, or CANCELLED." });

            var facility = await _db.Facilities.AsNoTracking().FirstOrDefaultAsync(x => x.Id == dto.FacilityId);
            if (facility == null) return BadRequest(new { message = "Facility not found." });

            var toLocOk = await _db.Locations.AsNoTracking()
                .AnyAsync(x => x.Id == dto.ToLocationId && x.FacilityId == dto.FacilityId);
            if (!toLocOk) return BadRequest(new { message = "ToLocation is invalid for selected facility." });

            Guid? fromLocationId = dto.FromLocationId;
            if (fromLocationId.HasValue && fromLocationId.Value != Guid.Empty)
            {
                var fromLocOk = await _db.Locations.AsNoTracking()
                    .AnyAsync(x => x.Id == fromLocationId.Value && x.FacilityId == dto.FacilityId);
                if (!fromLocOk) return BadRequest(new { message = "FromLocation is invalid for selected facility." });
            }
            else
            {
                fromLocationId = await ResolveLatestArrivalLocationId(dto.FacilityId, trailerNo);
                if (!fromLocationId.HasValue || fromLocationId.Value == Guid.Empty)
                    return BadRequest(new { message = "FromLocation not found from latest arrival for this trailer in selected facility." });
            }

            if (dto.CarrierId.HasValue)
            {
                var carrierOk = await _db.Carriers.AsNoTracking()
                    .AnyAsync(x => x.Id == dto.CarrierId.Value && x.FacilityId == dto.FacilityId);
                if (!carrierOk) return BadRequest(new { message = "Carrier is invalid for selected facility." });
            }

            var actor = ResolveActor();

            var entity = new YardMove
            {
                Id = Guid.NewGuid(),
                VehicleId = dto.VehicleId,
                TrailerNumber = trailerNo,
                FacilityId = dto.FacilityId,
                CarrierId = dto.CarrierId,
                FromLocationId = fromLocationId,
                ToLocationId = dto.ToLocationId,
                MoveDateTime = dto.MoveDateTime,
                Status = status,
                Remarks = string.IsNullOrWhiteSpace(dto.Remarks) ? null : dto.Remarks.Trim(),
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
                CreatedBy = actor,
                UpdatedBy = actor
            };

            _db.YardMoves.Add(entity);

            if (status == "COMPLETED")
                await ApplyCompletedMoveToArrivalAsync(dto.FacilityId, trailerNo, dto.ToLocationId);

            await _db.SaveChangesAsync();

            return Ok(new { id = entity.Id });
        }

        [HttpPut("{id:guid}")]
        public async Task<IActionResult> Update(Guid id, [FromBody] YardMoveCreateUpdateDto dto)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);

            var entity = await _db.YardMoves.FirstOrDefaultAsync(x => x.Id == id);
            if (entity == null) return NotFound(new { message = "Yard move not found." });

            var trailerNo = (dto.TrailerNumber ?? "").Trim().ToUpperInvariant();
            var status = NormalizeStatus(dto.Status);

            if (string.IsNullOrWhiteSpace(trailerNo))
                return BadRequest(new { message = "Trailer number is required." });

            if (!AllowedStatuses.Contains(status))
                return BadRequest(new { message = "Status must be PENDING, IN_PROGRESS, COMPLETED, or CANCELLED." });

            var facilityExists = await _db.Facilities.AsNoTracking().AnyAsync(x => x.Id == dto.FacilityId);
            if (!facilityExists) return BadRequest(new { message = "Facility not found." });

            var toLocOk = await _db.Locations.AsNoTracking()
                .AnyAsync(x => x.Id == dto.ToLocationId && x.FacilityId == dto.FacilityId);
            if (!toLocOk) return BadRequest(new { message = "ToLocation is invalid for selected facility." });

            Guid? fromLocationId = dto.FromLocationId;
            if (fromLocationId.HasValue && fromLocationId.Value != Guid.Empty)
            {
                var fromLocOk = await _db.Locations.AsNoTracking()
                    .AnyAsync(x => x.Id == fromLocationId.Value && x.FacilityId == dto.FacilityId);
                if (!fromLocOk) return BadRequest(new { message = "FromLocation is invalid for selected facility." });
            }
            else
            {
                fromLocationId = await ResolveLatestArrivalLocationId(dto.FacilityId, trailerNo);
                if (!fromLocationId.HasValue || fromLocationId.Value == Guid.Empty)
                    return BadRequest(new { message = "FromLocation not found from latest arrival for this trailer in selected facility." });
            }

            if (dto.CarrierId.HasValue)
            {
                var carrierOk = await _db.Carriers.AsNoTracking()
                    .AnyAsync(x => x.Id == dto.CarrierId.Value && x.FacilityId == dto.FacilityId);
                if (!carrierOk) return BadRequest(new { message = "Carrier is invalid for selected facility." });
            }

            entity.VehicleId = dto.VehicleId;
            entity.TrailerNumber = trailerNo;
            entity.FacilityId = dto.FacilityId;
            entity.CarrierId = dto.CarrierId;
            entity.FromLocationId = fromLocationId;
            entity.ToLocationId = dto.ToLocationId;
            entity.MoveDateTime = dto.MoveDateTime;
            entity.Status = status;
            entity.Remarks = string.IsNullOrWhiteSpace(dto.Remarks) ? null : dto.Remarks.Trim();
            entity.UpdatedAt = DateTime.UtcNow;
            entity.UpdatedBy = ResolveActor();

            if (status == "COMPLETED")
                await ApplyCompletedMoveToArrivalAsync(dto.FacilityId, trailerNo, dto.ToLocationId);

            await _db.SaveChangesAsync();
            return NoContent();
        }

        [HttpDelete("{id:guid}")]
        public async Task<IActionResult> Delete(Guid id)
        {
            var entity = await _db.YardMoves.FirstOrDefaultAsync(x => x.Id == id);
            if (entity == null) return NotFound(new { message = "Yard move not found." });

            var s = NormalizeStatus(entity.Status);
            if (s != "PENDING" && s != "CANCELLED")
                return BadRequest(new { message = "Only PENDING or CANCELLED move can be deleted." });

            _db.YardMoves.Remove(entity);
            await _db.SaveChangesAsync();
            return NoContent();
        }
    }
}
