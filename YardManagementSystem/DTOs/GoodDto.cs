using System.ComponentModel.DataAnnotations;

namespace YardManagementSystem.Dtos
{
    public class GoodsCreateUpdateDto
    {
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
    }

    public class GoodsItemDto
    {
        public Guid Id { get; set; }
        public Guid FacilityId { get; set; }
        public string FacilityName { get; set; } = string.Empty;
        public string GoodsName { get; set; } = string.Empty;
        public string GoodsCode { get; set; } = string.Empty;
        public decimal? Weight { get; set; }   // new
        public int? Quantity { get; set; }     // new
        public string Status { get; set; } = string.Empty;
        public int SortOrder { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime? UpdatedAt { get; set; }
    }
}
