using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace YardManagementSystem.Models
{
    public class Goods
    {
        [Key]
        public Guid Id { get; set; } = Guid.NewGuid();

        [Required]
        public Guid FacilityId { get; set; }

        [Required, MaxLength(100)]
        public string GoodsName { get; set; } = string.Empty;

        [Required, MaxLength(30)]
        public string GoodsCode { get; set; } = string.Empty;

        public decimal? Weight { get; set; }   // new
        public int? Quantity { get; set; }     // new

        [Required, MaxLength(20)]
        public string Status { get; set; } = "ACTIVE";

        public int SortOrder { get; set; } = 1;

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? UpdatedAt { get; set; }

        [ForeignKey(nameof(FacilityId))]
        public Facility? Facility { get; set; }
    }
}
