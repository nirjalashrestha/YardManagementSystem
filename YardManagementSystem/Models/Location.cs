using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace YardManagementSystem.Models
{
    public class Location
    {
        [Key]
        public Guid Id { get; set; } = Guid.NewGuid();

        [Required]
        public Guid FacilityId { get; set; }  // FK

        [ForeignKey(nameof(FacilityId))]
        public Facility? Facility { get; set; } // navigation

        [Required, MaxLength(120)]
        public string LocationName { get; set; } = "";

        [Required, MaxLength(20)]
        public string LocationCode { get; set; } = "";

        [Required, MaxLength(20)]
        public string LocationType { get; set; } = "GATE"; // GATE, DOCK, PARKING, INSPECTION

        public int? Capacity { get; set; }

        public int SortOrder { get; set; } = 1;
    }
}
