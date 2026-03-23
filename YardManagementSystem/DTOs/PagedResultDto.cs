using System.Collections.Generic;

namespace YardManagementSystem.Dtos
{
    public class PagedResultDto<T>
    {
        public int Total { get; set; }
        public int Shown { get; set; }
        public List<T> Items { get; set; } = new();
    }
}