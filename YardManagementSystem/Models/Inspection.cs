using System;
using System.ComponentModel.DataAnnotations;

namespace YardManagementSystem.Models
{
    public class Inspection
    {
        [Key]
        public int Id { get; set; }  

        [Required, MaxLength(50)]
        public string TrailerNumber { get; set; } = "";

        public DateOnly Date { get; set; }
        public TimeOnly Time { get; set; }

        public Guid CarrierId { get; set; }
        public Carrier? Carrier { get; set; }

        public Guid FacilityId { get; set; }
        public Facility? Facility { get; set; }

        public Guid LocationId { get; set; }
        public Location? Location { get; set; }

        [Required, MaxLength(100)]
        public string Issue { get; set; } = "";

        [Required, MaxLength(100)]
        public string Area { get; set; } = "";

        [Required, MaxLength(32)]
        public string Status { get; set; } = "Pending";

        [MaxLength(500)]
        public string? Remarks { get; set; }
    }
}