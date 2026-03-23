using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace YardManagementSystem.DTOs
{
    public class PagedResponseDto<T>
    {
        public int Total { get; set; }
        public int Shown { get; set; }
        public List<T> Items { get; set; } = new();
    }

    public class CountsTodayDto
    {
        public int TrucksInYard { get; set; }
        public int ArrivalsToday { get; set; }
        public int DeparturesToday { get; set; }
        public int Waiting { get; set; }
        public int ActiveDocks { get; set; }
        public int UpcomingAppointments { get; set; }
    }

    public class WeeklyStatDto
    {
        public string Date { get; set; } = "";
        public int Arrivals { get; set; }
        public int Departures { get; set; }
    }

    public class RecentGateActivityDto
    {
        public Guid Id { get; set; }
        public string Type { get; set; } = "";
        public string? TrailerType { get; set; }
        public string? TrailerNumber { get; set; }
        public string? DriverName { get; set; }
        public string? TimeIn { get; set; }
        public string? TimeOut { get; set; }
        public string? GateNo { get; set; }
        public string? CarrierName { get; set; }
        public string? FacilityName { get; set; }
        public string? LocationName { get; set; }
        public string? Status { get; set; }
        public DateTime CreatedAtUtc { get; set; }
    }

    // ---------------- ARRIVALS ----------------
    public class ArrivalListItemDto
    {
        public Guid Id { get; set; }
        public string ActivityId { get; set; } = "";
        public string Date { get; set; } = "";
        public string TimeIn { get; set; } = "";
        public string GateNo { get; set; } = "";

        public Guid FacilityId { get; set; }
        public string FacilityName { get; set; } = "";

        public Guid? LocationId { get; set; }
        public string? LocationName { get; set; }
        public string? LocationType { get; set; }

        public Guid? CarrierId { get; set; }
        public string? CarrierName { get; set; }

        public Guid? GoodsId { get; set; }
        public string? GoodsName { get; set; }

        public string? TrailerType { get; set; }
        public string? TrailerNumber { get; set; }

        public string? DriverUserId { get; set; }
        public string? DriverId { get; set; }
        public string? DriverName { get; set; }

        public string Purpose { get; set; } = "";
        public string Status { get; set; } = "";

        public bool DocumentVerified { get; set; }
        public bool LicenseVerified { get; set; }
        public bool SecurityCleared { get; set; }

        public string? Remarks { get; set; }
    }

    public class ArrivalUpsertDto
    {
        [Required]
        public string ActivityId { get; set; } = "";

        [Required]
        public string Date { get; set; } = "";

        [Required]
        public string TimeIn { get; set; } = "";

        [Required]
        public string GateNo { get; set; } = "";

        public Guid FacilityId { get; set; }
        public Guid? LocationId { get; set; }

        public Guid? CarrierId { get; set; }
        public Guid? GoodsId { get; set; }

        public string? TrailerType { get; set; }
        public string? TrailerNumber { get; set; }

        public string? DriverUserId { get; set; }
        public string? DriverId { get; set; }
        public string? DriverName { get; set; }

        public string Purpose { get; set; } = "Loading";
        public string Status { get; set; } = "Waiting";

        public bool DocumentVerified { get; set; } = true;
        public bool LicenseVerified { get; set; } = true;
        public bool SecurityCleared { get; set; } = true;

        public string? Remarks { get; set; }
    }

    // ---------------- DEPARTURES ----------------
    public class DepartureListItemDto
    {
        public Guid Id { get; set; }
        public string ActivityId { get; set; } = "";
        public string? RefArrivalActivityId { get; set; }
        public string? RefYardMoveId { get; set; }
        public string Date { get; set; } = "";
        public string TimeOut { get; set; } = "";
        public string ExitGateNo { get; set; } = "";

        public Guid FacilityId { get; set; }
        public string FacilityName { get; set; } = "";

        public Guid? LocationId { get; set; }
        public string? LocationName { get; set; }

        public Guid? GoodsId { get; set; }
        public string? GoodsName { get; set; }

        public string? CarrierName { get; set; }
        public string? TrailerNumber { get; set; }
        public string? TrailerType { get; set; }
        public string? DriverName { get; set; }

        public string LoadingStatus { get; set; } = "";
        public string FinalStatus { get; set; } = "";

        public string? DelayReason { get; set; }
        public string? DamageNotes { get; set; }
        public string? SecurityRemarks { get; set; }
    }

    public class DepartureUpsertDto
    {
        [Required]
        public string ActivityId { get; set; } = "";

        public string? RefArrivalActivityId { get; set; }
        public string? RefYardMoveId { get; set; }

        [Required]
        public string Date { get; set; } = "";

        [Required]
        public string TimeOut { get; set; } = "";

        [Required]
        public string ExitGateNo { get; set; } = "";

        public Guid FacilityId { get; set; }
        public Guid? LocationId { get; set; }

        public Guid? GoodsId { get; set; }

        public string? CarrierName { get; set; }
        public string? TrailerNumber { get; set; }
        public string? TrailerType { get; set; }
        public string? DriverName { get; set; }

        public string LoadingStatus { get; set; } = "Completed";
        public string FinalStatus { get; set; } = "Exited";

        public string? DelayReason { get; set; }
        public string? DamageNotes { get; set; }
        public string? SecurityRemarks { get; set; }
    }
}
