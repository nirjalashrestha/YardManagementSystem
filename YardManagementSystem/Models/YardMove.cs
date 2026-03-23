using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace YardManagementSystem.Models
{
    public class YardMove
    {
        [Key]
        public Guid Id { get; set; } = Guid.NewGuid();

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
        public string Status { get; set; } = "PENDING"; // PENDING, IN_PROGRESS, COMPLETED, CANCELLED

        [MaxLength(400)]
        public string? Remarks { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

        [MaxLength(100)]
        public string? CreatedBy { get; set; }

        [MaxLength(100)]
        public string? UpdatedBy { get; set; }

        [ForeignKey(nameof(VehicleId))]
        public Vehicle? Vehicle { get; set; }

        [ForeignKey(nameof(FacilityId))]
        public Facility? Facility { get; set; }

        [ForeignKey(nameof(CarrierId))]
        public Carrier? Carrier { get; set; }

        [ForeignKey(nameof(FromLocationId))]
        public Location? FromLocation { get; set; }

        [ForeignKey(nameof(ToLocationId))]
        public Location? ToLocation { get; set; }
    }
}
