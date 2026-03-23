using System;
using System.ComponentModel.DataAnnotations;

namespace YardManagementSystem.Models
{
    public class TrailerType
    {
        [Key]
        public Guid Id { get; set; }

        [Required]
        public Guid FacilityId { get; set; }

        [Required, MaxLength(240)]
        public string TrailerTypeName { get; set; } = string.Empty;

        [Required, MaxLength(40)]
        public string TrailerTypeCode { get; set; } = string.Empty;

        public decimal? Length { get; set; }

        [Required, MaxLength(10)]
        public string Status { get; set; } = "ACTIVE"; // ACTIVE, INACTIVE

        public int SortOrder { get; set; } = 1;

        public Facility? Facility { get; set; }
    }
}