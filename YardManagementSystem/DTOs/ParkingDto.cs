using System;
using System.ComponentModel.DataAnnotations;

namespace YardManagementSystem.Dtos
{
    public class ParkingSlotCreateUpdateDto
    {
        [Required]
        public Guid FacilityId { get; set; }

        [Required]
        public Guid LocationId { get; set; }

        [Required, MaxLength(80)]
        public string SlotCode { get; set; } = "";

        [Required, MaxLength(20)]
        public string SlotType { get; set; } = "GENERAL";

        [Required, MaxLength(20)]
        public string Status { get; set; } = "AVAILABLE";

        public int SortOrder { get; set; } = 1;
    }

    public class ParkingSlotItemDto
    {
        public Guid Id { get; set; }
        public Guid FacilityId { get; set; }
        public string FacilityName { get; set; } = "";
        public Guid LocationId { get; set; }
        public string LocationName { get; set; } = "";
        public string SlotCode { get; set; } = "";
        public string SlotType { get; set; } = "";
        public string Status { get; set; } = "";
        public int SortOrder { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime? UpdatedAt { get; set; }
    }

    public class ParkingAssignmentItemDto
    {
        public Guid Id { get; set; }
        public Guid ParkingSlotId { get; set; }
        public string SlotCode { get; set; } = "";
        public string SlotType { get; set; } = "";
        public string SlotStatus { get; set; } = "";

        public Guid ArrivalId { get; set; }
        public string ArrivalActivityId { get; set; } = "";
        public string? TrailerNumber { get; set; }
        public string? TrailerType { get; set; }
        public string? DriverName { get; set; }
        public string? Purpose { get; set; }
        public Guid? GoodsId { get; set; }
        public string? GoodsName { get; set; }

        public Guid FacilityId { get; set; }
        public string FacilityName { get; set; } = "";

        public DateTime ParkInAt { get; set; }
        public DateTime? ParkOutAt { get; set; }

        public bool IsActive { get; set; }
        public string Status { get; set; } = "OCCUPIED";
        public string? FinalStatus { get; set; }

        public string? Notes { get; set; }
        public string? CreatedBy { get; set; }
        public string? ReleasedBy { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime? ReleasedAt { get; set; }
    }

    public class AssignParkingDto
    {
        [Required]
        public Guid ParkingSlotId { get; set; }

        [Required]
        public Guid ArrivalId { get; set; }

        public DateTime? ParkInAt { get; set; }
    }

    public class ReleaseParkingDto
    {
        public DateTime? ParkOutAt { get; set; }

        [MaxLength(20)]
        [RegularExpression("^(COMPLETED|DELAYED|DAMAGED)$", ErrorMessage = "FinalStatus must be COMPLETED, DELAYED, or DAMAGED.")]
        public string? FinalStatus { get; set; }

        [MaxLength(300)]
        public string? Notes { get; set; }
    }
}
