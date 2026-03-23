using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace YardManagementSystem.Models
{
    public class Gate
    {
        [Key]
        public Guid Id { get; set; } = Guid.NewGuid();


        [Required]
        public Guid FacilityId { get; set; }


        [Required, MaxLength(80)]
        public string GateName { get; set; } = "";


        [Required, MaxLength(10)]
        public string GateType { get; set; } = "BOTH"; // ENTRY, EXIT, BOTH


        [Required, MaxLength(10)]
        public string Status { get; set; } = "ACTIVE"; // ACTIVE, INACTIVE


        public int SortOrder { get; set; } = 1;


        public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;

        public DateTime UpdatedAtUtc { get; set; } = DateTime.UtcNow;


        [ForeignKey(nameof(FacilityId))] public Facility? Facility { get; set; }
    }
}