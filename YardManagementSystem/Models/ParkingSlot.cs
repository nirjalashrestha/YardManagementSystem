using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace YardManagementSystem.Models
{
    public class ParkingSlot
    {
        [Key]
        public Guid Id { get; set; } = Guid.NewGuid();

        [Required]
        public Guid FacilityId { get; set; }

        [Required]
        public Guid LocationId { get; set; }

        [Required, MaxLength(80)]
        public string SlotCode { get; set; } = "";

        [Required, MaxLength(20)]
        public string SlotType { get; set; } = "GENERAL"; // GENERAL, REEFER, HAZMAT, OVERSIZE

        [Required, MaxLength(20)]
        public string Status { get; set; } = "AVAILABLE"; // AVAILABLE, OCCUPIED, RESERVED, MAINTENANCE, BLOCKED

        public int SortOrder { get; set; } = 1;

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? UpdatedAt { get; set; }

        [ForeignKey(nameof(FacilityId))]
        public Facility? Facility { get; set; }

        [ForeignKey(nameof(LocationId))]
        public Location? Location { get; set; }
    }
}
