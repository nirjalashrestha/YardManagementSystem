using System;
using System.ComponentModel.DataAnnotations;

namespace YardManagementSystem.Dtos
{
    public class DockAssignmentItemDto
    {
        public Guid Id { get; set; }

        public Guid DockId { get; set; }
        public string DockName { get; set; } = string.Empty;
        public string DockType { get; set; } = string.Empty;
        public string DockStatus { get; set; } = string.Empty; // AVAILABLE/OCCUPIED/...

        public Guid ArrivalId { get; set; }
        public string ArrivalActivityId { get; set; } = string.Empty;
        public string? TrailerType { get; set; }
        public string? TrailerNumber { get; set; }
        public string? DriverName { get; set; }
        public string? Purpose { get; set; }
    


        // NEW
        public Guid? GoodsId { get; set; }
        public string? GoodsName { get; set; }

        public string ArrivalStatus { get; set; } = string.Empty; // entered/exited/...

        public Guid FacilityId { get; set; }
        public string FacilityName { get; set; } = string.Empty;

        public DateTime DockInAt { get; set; }
        public DateTime? DockOutAt { get; set; }

        public bool IsActive { get; set; } // true = active assignment
        public string Status { get; set; } = "OCCUPIED"; // OCCUPIED/COMPLETED/DELAYED/DAMAGED
        public string? FinalStatus { get; set; } // COMPLETED/DELAYED/DAMAGED

        public string? Notes { get; set; }
        public string? CreatedBy { get; set; }
        public string? ReleasedBy { get; set; }

        public DateTime CreatedAt { get; set; }
        public DateTime? ReleasedAt { get; set; }
    }

    public class AssignDockDto
    {
        [Required]
        public Guid DockId { get; set; }

        [Required]
        public Guid ArrivalId { get; set; }

        public DateTime? DockInAt { get; set; }
    }

    public class ReleaseDockDto
    {
        public DateTime? DockOutAt { get; set; }

        [MaxLength(20)]
        [RegularExpression("^(COMPLETED|DELAYED|DAMAGED)$", ErrorMessage = "FinalStatus must be COMPLETED, DELAYED, or DAMAGED.")]
        public string? FinalStatus { get; set; }

        [MaxLength(300)]
        public string? Notes { get; set; }
    }
}
