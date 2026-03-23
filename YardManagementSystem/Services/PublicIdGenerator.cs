namespace YardManagementSystem.Services
{
    public static class PublicIdGenerator
    {
        public static string Generate(string role = "View Only")
        {
            var date = DateTime.UtcNow.ToString("yyyyMMdd");
            var rnd = Random.Shared.Next(100, 999);

            return role == "Driver"
                ? $"DRV-{date}-{rnd}"
                : $"USR-{date}-{rnd}";
        }
    }
}