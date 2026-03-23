using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace YardManagementSystem.Models
{
    public class ParkingAssignment
    {
        [Key]
        public Guid Id { get; set; } = Guid.NewGuid();

        [Required]
        public Guid ParkingSlotId { get; set; }

        [Required]
        public Guid ArrivalId { get; set; }

        [Required]
        public DateTime ParkInAt { get; set; } = DateTime.UtcNow;

        public DateTime? ParkOutAt { get; set; }

        public bool IsActive { get; set; } = true;

        [Required, MaxLength(20)]
        public string Status { get; set; } = "OCCUPIED"; // OCCUPIED or final status after release

        [MaxLength(20)]
        public string? FinalStatus { get; set; } // COMPLETED, DELAYED, DAMAGED

        [MaxLength(300)]
        public string? Notes { get; set; }

        [MaxLength(100)]
        public string? CreatedBy { get; set; }

        [MaxLength(100)]
        public string? ReleasedBy { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? ReleasedAt { get; set; }

        [ForeignKey(nameof(ParkingSlotId))]
        public ParkingSlot? ParkingSlot { get; set; }

        [ForeignKey(nameof(ArrivalId))]
        public Arrival? Arrival { get; set; }
    }
}
