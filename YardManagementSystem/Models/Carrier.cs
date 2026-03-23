using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace YardManagementSystem.Models
{
    public class Carrier
    {
        [Key]
        public Guid Id { get; set; } = Guid.NewGuid();

        [Required, MaxLength(240)]
        public string CarrierName { get; set; } = "";

        [Required, MaxLength(40)]
        public string CarrierCode { get; set; } = "";

        [Required]
        public Guid FacilityId { get; set; }

        [ForeignKey(nameof(FacilityId))]
        public Facility? Facility { get; set; }

        public int SortOrder { get; set; } = 1;
    }
}