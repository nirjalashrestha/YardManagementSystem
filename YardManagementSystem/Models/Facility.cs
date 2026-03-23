using System;
using System.ComponentModel.DataAnnotations;

namespace YardManagementSystem.Models
{
    public class Facility
    {
        [Key]
        public Guid Id { get; set; } = Guid.NewGuid();

        [Required, MaxLength(240)]
        public string FacilityName { get; set; } = "";

        [Required, MaxLength(40)]
        public string FacilityCode { get; set; } = "";

        [Required, MaxLength(100)]
        public string Type { get; set; } = "";
    }
}