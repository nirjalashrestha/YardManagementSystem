using System;
using System.ComponentModel.DataAnnotations;

namespace YardManagementSystem.Dtos
{
    public class YardMoveItemDto
    {
        public Guid Id { get; set; }
        public Guid? VehicleId { get; set; }
        public string TrailerNumber { get; set; } = "";

        public Guid FacilityId { get; set; }
        public string FacilityName { get; set; } = "";

        public Guid? CarrierId { get; set; }
        public string? CarrierName { get; set; }

        public Guid? FromLocationId { get; set; }
        public string? FromLocationName { get; set; }
        public string? FromLocationType { get; set; }

        public Guid ToLocationId { get; set; }
        public string ToLocationName { get; set; } = "";
        public string? ToLocationType { get; set; }

        public string? RefId { get; set; }

        public DateTime MoveDateTime { get; set; }
        public string Status { get; set; } = "";
        public string? Remarks { get; set; }

        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
        public string? CreatedBy { get; set; }
        public string? UpdatedBy { get; set; }
    }

    public class YardMoveCreateUpdateDto
    {
        public Guid? VehicleId { get; set; }

        [Required, MaxLength(60)]
        public string TrailerNumber { get; set; } = "";

        [Required]
        public Guid FacilityId { get; set; }

        public Guid? CarrierId { get; set; }
        public Guid? FromLocationId { get; set; }

        [Required]
        public Guid ToLocationId { get; set; }

        [Required]
        public DateTime MoveDateTime { get; set; }

        [Required, MaxLength(20)]
        public string Status { get; set; } = "PENDING";

        [MaxLength(400)]
        public string? Remarks { get; set; }
    }
}
