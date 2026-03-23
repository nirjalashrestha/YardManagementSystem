using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using YardManagementSystem.Data;
using YardManagementSystem.DTOs;
using YardManagementSystem.Models;
using YardManagementSystem.Security;
using YardManagementSystem.Services;

namespace YardManagementSystem.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class GateActivityController : ControllerBase
    {
        private readonly ApplicationDbContext _db;
        private readonly NotificationService _notifications;

        public GateActivityController(ApplicationDbContext db, NotificationService notifications)
        {
            _db = db;
            _notifications = notifications;
        }

        private ActionResult BadModel() => ValidationProblem(ModelState);
        private static string SafeTrim(string? s) => (s ?? "").Trim();

        private static bool IsEntered(string? s) =>
            string.Equals((s ?? "").Trim(), "Entered", StringComparison.OrdinalIgnoreCase);

        private static bool IsExited(string? s) =>
            string.Equals((s ?? "").Trim(), "Exited", StringComparison.OrdinalIgnoreCase);

        private async Task<(Guid FacilityId, string? ErrorMessage)> ResolveFacilityId(
            Guid facilityId,
            Guid? locationId,
            Guid? fallbackFacilityId = null)
        {
            if (facilityId != Guid.Empty) return (facilityId, null);
            if (fallbackFacilityId.HasValue && fallbackFacilityId.Value != Guid.Empty) return (fallbackFacilityId.Value, null);

            if (locationId.HasValue)
            {
                var locFacilityId = await _db.Locations.AsNoTracking()
                    .Where(l => l.Id == locationId.Value)
                    .Select(l => l.FacilityId)
                    .FirstOrDefaultAsync();

                if (locFacilityId != Guid.Empty) return (locFacilityId, null);
                return (Guid.Empty, "Invalid LocationId.");
            }

            var defaultFacilityId = await _db.Facilities.AsNoTracking()
                .Select(f => f.Id)
                .FirstOrDefaultAsync();

            if (defaultFacilityId != Guid.Empty) return (defaultFacilityId, null);
            return (Guid.Empty, "FacilityId is required.");
        }

        private async Task<string?> ValidateGoodsForFacility(Guid? goodsId, Guid facilityId)
        {
            if (!goodsId.HasValue || goodsId.Value == Guid.Empty) return null;

            var ok = await _db.Goods.AsNoTracking().AnyAsync(g =>
                g.Id == goodsId.Value &&
                g.FacilityId == facilityId &&
                g.Status == "ACTIVE");

            return ok ? null : "Invalid GoodsId for the selected Facility.";
        }

        // ===========================
        // ARRIVALS
        // ===========================

        [HttpGet("arrivals")]
        [Authorize(Roles = RbacRoles.READ_ACCESS)]
        public async Task<ActionResult<PagedResponseDto<ArrivalListItemDto>>> GetArrivals(
            [FromQuery] string? search = "",
            [FromQuery] int skip = 0,
            [FromQuery] int take = 6)
        {
            if (skip < 0) skip = 0;
            if (take < 1) take = 6;
            if (take > 50) take = 50;

            var s = SafeTrim(search);

            var query = _db.Arrivals
                .AsNoTracking()
                .Include(a => a.Carrier)
                .Include(a => a.Facility)
                .Include(a => a.Location)
                .Include(a => a.Goods)
                .AsQueryable();

            if (!string.IsNullOrWhiteSpace(s))
            {
                query = query.Where(a =>
                    a.ActivityId.Contains(s) ||
                    (a.TrailerNumber ?? "").Contains(s) ||
                    (a.DriverName ?? "").Contains(s) ||
                    (a.Status ?? "").Contains(s) ||
                    (a.Goods != null && a.Goods.GoodsName.Contains(s)));
            }

            var total = await query.CountAsync();

            var items = await query
                .OrderByDescending(a => a.CreatedAtUtc)
                .Skip(skip)
                .Take(take)
                .Select(a => new ArrivalListItemDto
                {
                    Id = a.Id,
                    ActivityId = a.ActivityId,
                    Date = a.Date,
                    TimeIn = a.TimeIn,
                    GateNo = a.GateNo,

                    FacilityId = a.FacilityId,
                    FacilityName = a.Facility != null ? a.Facility.FacilityName : "",

                    LocationId = a.LocationId,
                    LocationName = a.Location != null ? a.Location.LocationName : null,
                    LocationType = a.Location != null ? a.Location.LocationType : null,

                    CarrierId = a.CarrierId,
                    CarrierName = a.Carrier != null ? a.Carrier.CarrierName : null,

                    GoodsId = a.GoodsId,
                    GoodsName = a.Goods != null ? a.Goods.GoodsName : null,

                    TrailerType = a.TrailerType,
                    TrailerNumber = a.TrailerNumber,

                    DriverUserId = a.DriverUserId,
                    DriverId = a.DriverId,
                    DriverName = a.DriverName,

                    Purpose = a.Purpose,
                    Status = a.Status,

                    DocumentVerified = a.DocumentVerified,
                    LicenseVerified = a.LicenseVerified,
                    SecurityCleared = a.SecurityCleared,

                    Remarks = a.Remarks
                })
                .ToListAsync();

            return Ok(new PagedResponseDto<ArrivalListItemDto>
            {
                Total = total,
                Shown = Math.Min(skip + items.Count, total),
                Items = items
            });
        }

        [HttpPost("arrivals")]
        [Authorize(Roles = RbacRoles.GATE_OPS)]
        public async Task<ActionResult> CreateArrival([FromBody] ArrivalUpsertDto dto)
        {
            if (!ModelState.IsValid) return BadModel();

            if (string.IsNullOrWhiteSpace(dto.GateNo))
                return BadRequest("GateNo is required.");

            var (facilityId, facilityError) = await ResolveFacilityId(dto.FacilityId, dto.LocationId);
            if (facilityError != null) return BadRequest(facilityError);

            var facilityExists = await _db.Facilities.AnyAsync(f => f.Id == facilityId);
            if (!facilityExists) return BadRequest("Invalid FacilityId.");

            if (dto.LocationId.HasValue)
            {
                var locOk = await _db.Locations.AnyAsync(l =>
                    l.Id == dto.LocationId.Value && l.FacilityId == facilityId);
                if (!locOk) return BadRequest("Invalid LocationId for the selected Facility.");
            }

            if (dto.CarrierId.HasValue)
            {
                var carrierOk = await _db.Carriers.AnyAsync(c =>
                    c.Id == dto.CarrierId.Value && c.FacilityId == facilityId);
                if (!carrierOk) return BadRequest("Invalid CarrierId for the selected Facility.");
            }

            var goodsError = await ValidateGoodsForFacility(dto.GoodsId, facilityId);
            if (goodsError != null) return BadRequest(goodsError);

            var entity = new Arrival
            {
                ActivityId = SafeTrim(dto.ActivityId),
                Date = SafeTrim(dto.Date),
                TimeIn = SafeTrim(dto.TimeIn),
                GateNo = SafeTrim(dto.GateNo), // removed "Gate 1" fallback

                FacilityId = facilityId,
                LocationId = dto.LocationId,
                CarrierId = dto.CarrierId,
                GoodsId = dto.GoodsId,

                TrailerType = dto.TrailerType,
                TrailerNumber = SafeTrim(dto.TrailerNumber).ToUpperInvariant(),

                DriverUserId = dto.DriverUserId,
                DriverId = dto.DriverId,
                DriverName = dto.DriverName,

                Purpose = string.IsNullOrWhiteSpace(dto.Purpose) ? "Loading" : dto.Purpose,
                Status = string.IsNullOrWhiteSpace(dto.Status) ? "Waiting" : dto.Status,

                DocumentVerified = dto.DocumentVerified,
                LicenseVerified = dto.LicenseVerified,
                SecurityCleared = dto.SecurityCleared,

                Remarks = dto.Remarks,
                CreatedAtUtc = DateTime.UtcNow
            };

            _db.Arrivals.Add(entity);
            await _db.SaveChangesAsync();

            if (IsEntered(entity.Status))
                await _notifications.NotifyArrivalEnteredAsync(entity);

            return Ok(new { id = entity.Id });
        }

        [HttpPut("arrivals/{id:guid}")]
        [Authorize(Roles = RbacRoles.GATE_OPS)]
        public async Task<ActionResult> UpdateArrival(Guid id, [FromBody] ArrivalUpsertDto dto)
        {
            if (!ModelState.IsValid) return BadModel();

            if (string.IsNullOrWhiteSpace(dto.GateNo))
                return BadRequest("GateNo is required.");

            var entity = await _db.Arrivals.FirstOrDefaultAsync(a => a.Id == id);
            if (entity == null) return NotFound();

            var oldStatus = entity.Status;

            var (facilityId, facilityError) = await ResolveFacilityId(dto.FacilityId, dto.LocationId, entity.FacilityId);
            if (facilityError != null) return BadRequest(facilityError);

            var facilityExists = await _db.Facilities.AnyAsync(f => f.Id == facilityId);
            if (!facilityExists) return BadRequest("Invalid FacilityId.");

            if (dto.LocationId.HasValue)
            {
                var locOk = await _db.Locations.AnyAsync(l =>
                    l.Id == dto.LocationId.Value && l.FacilityId == facilityId);
                if (!locOk) return BadRequest("Invalid LocationId for the selected Facility.");
            }

            if (dto.CarrierId.HasValue)
            {
                var carrierOk = await _db.Carriers.AnyAsync(c =>
                    c.Id == dto.CarrierId.Value && c.FacilityId == facilityId);
                if (!carrierOk) return BadRequest("Invalid CarrierId for the selected Facility.");
            }

            var goodsError = await ValidateGoodsForFacility(dto.GoodsId, facilityId);
            if (goodsError != null) return BadRequest(goodsError);

            entity.ActivityId = SafeTrim(dto.ActivityId);
            entity.Date = SafeTrim(dto.Date);
            entity.TimeIn = SafeTrim(dto.TimeIn);
            entity.GateNo = SafeTrim(dto.GateNo); // removed "Gate 1" fallback

            entity.FacilityId = facilityId;
            entity.LocationId = dto.LocationId;
            entity.CarrierId = dto.CarrierId;
            entity.GoodsId = dto.GoodsId;

            entity.TrailerType = dto.TrailerType;
            entity.TrailerNumber = SafeTrim(dto.TrailerNumber).ToUpperInvariant();

            entity.DriverUserId = dto.DriverUserId;
            entity.DriverId = dto.DriverId;
            entity.DriverName = dto.DriverName;

            entity.Purpose = string.IsNullOrWhiteSpace(dto.Purpose) ? "Loading" : dto.Purpose;
            entity.Status = string.IsNullOrWhiteSpace(dto.Status) ? "Waiting" : dto.Status;

            entity.DocumentVerified = dto.DocumentVerified;
            entity.LicenseVerified = dto.LicenseVerified;
            entity.SecurityCleared = dto.SecurityCleared;

            entity.Remarks = dto.Remarks;

            await _db.SaveChangesAsync();

            if (!IsEntered(oldStatus) && IsEntered(entity.Status))
                await _notifications.NotifyArrivalEnteredAsync(entity);

            return Ok();
        }

        [HttpDelete("arrivals/{id:guid}")]
        [Authorize(Roles = RbacRoles.GATE_OPS)]
        public async Task<ActionResult> DeleteArrival(Guid id)
        {
            var entity = await _db.Arrivals.FirstOrDefaultAsync(a => a.Id == id);
            if (entity == null) return NotFound();

            _db.Arrivals.Remove(entity);
            await _db.SaveChangesAsync();
            return Ok();
        }

        // ===========================
        // DEPARTURES
        // ===========================

        [HttpGet("departures")]
        [Authorize(Roles = RbacRoles.READ_ACCESS)]
        public async Task<ActionResult<PagedResponseDto<DepartureListItemDto>>> GetDepartures(
            [FromQuery] string? search = "",
            [FromQuery] int skip = 0,
            [FromQuery] int take = 6)
        {
            if (skip < 0) skip = 0;
            if (take < 1) take = 6;
            if (take > 50) take = 50;

            var s = SafeTrim(search);

            var query = _db.Departures
                .AsNoTracking()
                .Include(d => d.Facility)
                .Include(d => d.Location)
                .Include(d => d.Goods)
                .AsQueryable();

            if (!string.IsNullOrWhiteSpace(s))
            {
                query = query.Where(d =>
                    d.ActivityId.Contains(s) ||
                    (d.TrailerNumber ?? "").Contains(s) ||
                    (d.CarrierName ?? "").Contains(s) ||
                    (d.FinalStatus ?? "").Contains(s) ||
                    (d.Goods != null && d.Goods.GoodsName.Contains(s)));
            }

            var total = await query.CountAsync();

            var items = await query
                .OrderByDescending(d => d.CreatedAtUtc)
                .Skip(skip)
                .Take(take)
                .Select(d => new DepartureListItemDto
                {
                    Id = d.Id,
                    ActivityId = d.ActivityId,
                    RefArrivalActivityId = d.RefArrivalActivityId,
                    RefYardMoveId = d.RefYardMoveId,
                    Date = d.Date,
                    TimeOut = d.TimeOut,
                    ExitGateNo = d.ExitGateNo,

                    FacilityId = d.FacilityId,
                    FacilityName = d.Facility != null ? d.Facility.FacilityName : "",

                    LocationId = d.LocationId,
                    LocationName = d.Location != null ? d.Location.LocationName : null,

                    GoodsId = d.GoodsId,
                    GoodsName = d.Goods != null ? d.Goods.GoodsName : null,

                    CarrierName = d.CarrierName,
                    TrailerNumber = d.TrailerNumber,
                    TrailerType = d.TrailerType,
                    DriverName = d.DriverName,

                    LoadingStatus = d.LoadingStatus,
                    FinalStatus = d.FinalStatus,

                    DelayReason = d.DelayReason,
                    DamageNotes = d.DamageNotes,
                    SecurityRemarks = d.SecurityRemarks
                })
                .ToListAsync();

            return Ok(new PagedResponseDto<DepartureListItemDto>
            {
                Total = total,
                Shown = Math.Min(skip + items.Count, total),
                Items = items
            });
        }

        [HttpPost("departures")]
        [Authorize(Roles = RbacRoles.GATE_OPS)]
        public async Task<ActionResult> CreateDeparture([FromBody] DepartureUpsertDto dto)
        {
            if (!ModelState.IsValid) return BadModel();

            if (string.IsNullOrWhiteSpace(dto.ExitGateNo))
                return BadRequest("ExitGateNo is required.");

            string? warning = null;
            if (!string.IsNullOrWhiteSpace(dto.RefArrivalActivityId))
            {
                var refArrivalId = await _db.Arrivals.AsNoTracking()
                    .Where(a => a.ActivityId == dto.RefArrivalActivityId)
                    .Select(a => a.Id)
                    .FirstOrDefaultAsync();

                if (refArrivalId != Guid.Empty)
                {
                    var hasActiveDock = await _db.DockAssignments.AsNoTracking()
                        .AnyAsync(x => x.ArrivalId == refArrivalId && x.DockOutAt == null);

                    if (hasActiveDock)
                        warning = "Warning: This arrival still has an active dock assignment.";
                }
            }

            var (facilityId, facilityError) = await ResolveFacilityId(dto.FacilityId, dto.LocationId);
            if (facilityError != null) return BadRequest(facilityError);

            var facilityExists = await _db.Facilities.AnyAsync(f => f.Id == facilityId);
            if (!facilityExists) return BadRequest("Invalid FacilityId.");

            if (dto.LocationId.HasValue)
            {
                var locOk = await _db.Locations.AnyAsync(l =>
                    l.Id == dto.LocationId.Value && l.FacilityId == facilityId);
                if (!locOk) return BadRequest("Invalid LocationId for the selected Facility.");
            }

            var goodsError = await ValidateGoodsForFacility(dto.GoodsId, facilityId);
            if (goodsError != null) return BadRequest(goodsError);

            var entity = new Departure
            {
                ActivityId = SafeTrim(dto.ActivityId),
                RefArrivalActivityId = dto.RefArrivalActivityId,
                RefYardMoveId = string.IsNullOrWhiteSpace(dto.RefYardMoveId) ? null : SafeTrim(dto.RefYardMoveId),
                Date = SafeTrim(dto.Date),
                TimeOut = SafeTrim(dto.TimeOut),
                ExitGateNo = SafeTrim(dto.ExitGateNo),

                FacilityId = facilityId,
                LocationId = dto.LocationId,
                GoodsId = dto.GoodsId,

                CarrierName = dto.CarrierName,
                TrailerNumber = SafeTrim(dto.TrailerNumber).ToUpperInvariant(),
                TrailerType = dto.TrailerType,
                DriverName = dto.DriverName,

                LoadingStatus = string.IsNullOrWhiteSpace(dto.LoadingStatus) ? "Completed" : dto.LoadingStatus,
                FinalStatus = string.IsNullOrWhiteSpace(dto.FinalStatus) ? "Exited" : dto.FinalStatus,

                DelayReason = dto.DelayReason,
                DamageNotes = dto.DamageNotes,
                SecurityRemarks = dto.SecurityRemarks,

                CreatedAtUtc = DateTime.UtcNow
            };

            _db.Departures.Add(entity);
            await _db.SaveChangesAsync();

            if (IsExited(entity.FinalStatus))
                await _notifications.NotifyDepartureExitedAsync(entity);

            return Ok(new { id = entity.Id, warning });
        }

        [HttpPut("departures/{id:guid}")]
        [Authorize(Roles = RbacRoles.GATE_OPS)]
        public async Task<ActionResult> UpdateDeparture(Guid id, [FromBody] DepartureUpsertDto dto)
        {
            if (!ModelState.IsValid) return BadModel();

            if (string.IsNullOrWhiteSpace(dto.ExitGateNo))
                return BadRequest("ExitGateNo is required.");

            var entity = await _db.Departures.FirstOrDefaultAsync(d => d.Id == id);
            if (entity == null) return NotFound();

            var oldFinalStatus = entity.FinalStatus;

            var (facilityId, facilityError) = await ResolveFacilityId(dto.FacilityId, dto.LocationId, entity.FacilityId);
            if (facilityError != null) return BadRequest(facilityError);

            var facilityExists = await _db.Facilities.AnyAsync(f => f.Id == facilityId);
            if (!facilityExists) return BadRequest("Invalid FacilityId.");

            if (dto.LocationId.HasValue)
            {
                var locOk = await _db.Locations.AnyAsync(l =>
                    l.Id == dto.LocationId.Value && l.FacilityId == facilityId);
                if (!locOk) return BadRequest("Invalid LocationId for the selected Facility.");
            }

            var goodsError = await ValidateGoodsForFacility(dto.GoodsId, facilityId);
            if (goodsError != null) return BadRequest(goodsError);

            entity.ActivityId = SafeTrim(dto.ActivityId);
            entity.RefArrivalActivityId = dto.RefArrivalActivityId;
            entity.RefYardMoveId = string.IsNullOrWhiteSpace(dto.RefYardMoveId) ? null : SafeTrim(dto.RefYardMoveId);
            entity.Date = SafeTrim(dto.Date);
            entity.TimeOut = SafeTrim(dto.TimeOut);
            entity.ExitGateNo = SafeTrim(dto.ExitGateNo);

            entity.FacilityId = facilityId;
            entity.LocationId = dto.LocationId;
            entity.GoodsId = dto.GoodsId;

            entity.CarrierName = dto.CarrierName;
            entity.TrailerNumber = SafeTrim(dto.TrailerNumber).ToUpperInvariant();
            entity.TrailerType = dto.TrailerType;
            entity.DriverName = dto.DriverName;

            entity.LoadingStatus = string.IsNullOrWhiteSpace(dto.LoadingStatus) ? "Completed" : dto.LoadingStatus;
            entity.FinalStatus = string.IsNullOrWhiteSpace(dto.FinalStatus) ? "Exited" : dto.FinalStatus;

            entity.DelayReason = dto.DelayReason;
            entity.DamageNotes = dto.DamageNotes;
            entity.SecurityRemarks = dto.SecurityRemarks;

            await _db.SaveChangesAsync();

            if (!IsExited(oldFinalStatus) && IsExited(entity.FinalStatus))
                await _notifications.NotifyDepartureExitedAsync(entity);

            return Ok();
        }

        [HttpDelete("departures/{id:guid}")]
        [Authorize(Roles = RbacRoles.GATE_OPS)]
        public async Task<ActionResult> DeleteDeparture(Guid id)
        {
            var entity = await _db.Departures.FirstOrDefaultAsync(d => d.Id == id);
            if (entity == null) return NotFound();

            _db.Departures.Remove(entity);
            await _db.SaveChangesAsync();
            return Ok();
        }

        [HttpGet("recent")]
        [Authorize(Roles = RbacRoles.READ_ACCESS)]
        public async Task<ActionResult<PagedResponseDto<RecentGateActivityDto>>> GetRecent(
            [FromQuery] int skip = 0,
            [FromQuery] int take = 6)
        {
            if (skip < 0) skip = 0;
            if (take < 1) take = 6;
            if (take > 50) take = 50;

            var arrivalsQ = _db.Arrivals
                .AsNoTracking()
                .Include(a => a.Facility)
                .Include(a => a.Location)
                .Select(a => new RecentGateActivityDto
                {
                    Id = a.Id,
                    Type = "Arrival",
                    TrailerType = a.TrailerType,
                    TrailerNumber = a.TrailerNumber,
                    DriverName = a.DriverName,
                    TimeIn = a.TimeIn,
                    TimeOut = null,
                    GateNo = a.GateNo,
                    CarrierName = null,
                    FacilityName = a.Facility != null ? a.Facility.FacilityName : "",
                    LocationName = a.Location != null ? a.Location.LocationName : null,
                    Status = a.Status,
                    CreatedAtUtc = a.CreatedAtUtc
                });

            var departuresQ = _db.Departures
                .AsNoTracking()
                .Include(d => d.Facility)
                .Include(d => d.Location)
                .Select(d => new RecentGateActivityDto
                {
                    Id = d.Id,
                    Type = "Departure",
                    TrailerType = d.TrailerType,
                    TrailerNumber = d.TrailerNumber,
                    DriverName = d.DriverName,
                    TimeIn = null,
                    TimeOut = d.TimeOut,
                    GateNo = d.ExitGateNo,
                    CarrierName = d.CarrierName,
                    FacilityName = d.Facility != null ? d.Facility.FacilityName : "",
                    LocationName = d.Location != null ? d.Location.LocationName : null,
                    Status = d.FinalStatus,
                    CreatedAtUtc = d.CreatedAtUtc
                });

            var union = arrivalsQ.Concat(departuresQ);

            var total = await union.CountAsync();

            var items = await union
                .OrderByDescending(x => x.CreatedAtUtc)
                .Skip(skip)
                .Take(take)
                .ToListAsync();

            return Ok(new PagedResponseDto<RecentGateActivityDto>
            {
                Total = total,
                Shown = Math.Min(skip + items.Count, total),
                Items = items
            });
        }

        [HttpGet("counts-today")]
        [Authorize(Roles = RbacRoles.READ_ACCESS)]
        public async Task<ActionResult<CountsTodayDto>> GetCountsToday()
        {
            var today = DateTime.UtcNow.ToString("yyyy-MM-dd");

            var arrivalsToday = await _db.Arrivals.AsNoTracking().CountAsync(a => a.Date == today);
            var departuresToday = await _db.Departures.AsNoTracking().CountAsync(d => d.Date == today);

            var waiting = await _db.Arrivals.AsNoTracking()
                .CountAsync(a => a.Date == today && a.Status == "Waiting");

            var activeDocks = await _db.Arrivals.AsNoTracking()
                .CountAsync(a => a.Date == today && a.Status == "SentToDock");

            var arrivals = await _db.Arrivals.AsNoTracking()
                .Where(a => a.Status == null || a.Status.ToLower() != "rejected")
                .Select(a => new
                {
                    a.ActivityId,
                    TrailerNumber = (a.TrailerNumber ?? "").Trim().ToUpperInvariant(),
                    a.CreatedAtUtc
                })
                .ToListAsync();

            var departures = await _db.Departures.AsNoTracking()
                .Select(d => new
                {
                    d.RefArrivalActivityId,
                    TrailerNumber = (d.TrailerNumber ?? "").Trim().ToUpperInvariant(),
                    d.CreatedAtUtc
                })
                .ToListAsync();

            var latestArrivals = arrivals
                .Where(a => !string.IsNullOrWhiteSpace(a.TrailerNumber))
                .GroupBy(a => a.TrailerNumber)
                .Select(g => g.OrderByDescending(x => x.CreatedAtUtc).First())
                .ToList();

            var trucksInYard = latestArrivals.Count(a =>
            {
                var departedByRef = !string.IsNullOrWhiteSpace(a.ActivityId) &&
                                    departures.Any(d => d.RefArrivalActivityId == a.ActivityId);

                var departedByTrailer = departures.Any(d =>
                    d.TrailerNumber == a.TrailerNumber &&
                    d.CreatedAtUtc >= a.CreatedAtUtc);

                return !(departedByRef || departedByTrailer);
            });

            return Ok(new CountsTodayDto
            {
                TrucksInYard = trucksInYard,
                ArrivalsToday = arrivalsToday,
                DeparturesToday = departuresToday,
                Waiting = waiting,
                ActiveDocks = activeDocks,
                UpcomingAppointments = 0
            });
        }

        [HttpGet("weekly-stats")]
        [Authorize(Roles = RbacRoles.READ_ACCESS)]
        public async Task<ActionResult<List<WeeklyStatDto>>> GetWeeklyStats([FromQuery] int days = 7)
        {
            if (days < 1) days = 7;
            if (days > 31) days = 31;

            var start = DateTime.UtcNow.Date.AddDays(-(days - 1));
            var startStr = start.ToString("yyyy-MM-dd");
            var endStr = DateTime.UtcNow.Date.ToString("yyyy-MM-dd");

            var arrivals = await _db.Arrivals.AsNoTracking()
                .Where(a => string.Compare(a.Date, startStr, StringComparison.Ordinal) >= 0 &&
                            string.Compare(a.Date, endStr, StringComparison.Ordinal) <= 0)
                .GroupBy(a => a.Date)
                .Select(g => new { Date = g.Key, Count = g.Count() })
                .ToListAsync();

            var departures = await _db.Departures.AsNoTracking()
                .Where(d => string.Compare(d.Date, startStr, StringComparison.Ordinal) >= 0 &&
                            string.Compare(d.Date, endStr, StringComparison.Ordinal) <= 0)
                .GroupBy(d => d.Date)
                .Select(g => new { Date = g.Key, Count = g.Count() })
                .ToListAsync();

            var result = new List<WeeklyStatDto>();
            for (int i = 0; i < days; i++)
            {
                var day = start.AddDays(i).ToString("yyyy-MM-dd");
                result.Add(new WeeklyStatDto
                {
                    Date = day,
                    Arrivals = arrivals.FirstOrDefault(x => x.Date == day)?.Count ?? 0,
                    Departures = departures.FirstOrDefault(x => x.Date == day)?.Count ?? 0
                });
            }

            return Ok(result);
        }
    }
}

