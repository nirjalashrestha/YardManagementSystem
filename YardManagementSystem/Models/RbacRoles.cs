namespace YardManagementSystem.Security
{
    public static class RbacRoles
    {
        // Identity role keys (DB / claims)
        public const string ADMIN = "Admin";
        public const string YARD_MANAGER = "YardManager";
        public const string YARD_JOCKEY = "YardJockey";
        public const string GATE_SECURITY = "GateSecurity";
        public const string DRIVER = "Driver";
        public const string VIEW_ONLY = "ViewOnly";

        public static readonly string[] All =
        {
            ADMIN, YARD_MANAGER, YARD_JOCKEY, GATE_SECURITY, DRIVER, VIEW_ONLY
        };

        // Policy role sets (for [Authorize(Roles = ...)])
        public const string ADMIN_ONLY = ADMIN;
        public const string OPERATIONAL = ADMIN + "," + GATE_SECURITY + "," + YARD_MANAGER + "," + YARD_JOCKEY;
        public const string READ_ACCESS = OPERATIONAL + "," + VIEW_ONLY;
        public const string GATE_OPS = ADMIN + "," + GATE_SECURITY;

        // Frontend-friendly role code
        public static string ToRoleCode(string? roleKey)
        {
            var key = (roleKey ?? "").Trim();
            return key switch
            {
                ADMIN => "ADMIN",
                YARD_MANAGER => "YARD_MANAGER",
                YARD_JOCKEY => "YARD_JOCKEY",
                GATE_SECURITY => "GATE_SECURITY",
                DRIVER => "DRIVER",
                VIEW_ONLY => "VIEW_ONLY",
                _ => "VIEW_ONLY"
            };
        }

        // UI display role
        public static string ToDisplay(string? roleKey)
        {
            var key = (roleKey ?? "").Trim();
            return key switch
            {
                ADMIN => "Admin",
                YARD_MANAGER => "Yard Manager",
                YARD_JOCKEY => "Yard Jockey",
                GATE_SECURITY => "Gate Security",
                DRIVER => "Driver",
                VIEW_ONLY => "View Only",
                _ => "View Only"
            };
        }

        // Normalize input from UI/token/db to identity role key
        public static string NormalizeToKey(string? input)
        {
            var raw = (input ?? "").Trim();
            if (string.IsNullOrWhiteSpace(raw)) return VIEW_ONLY;

            var compact = raw.Replace(" ", "").Replace("_", "").ToUpperInvariant();

            return compact switch
            {
                "ADMIN" => ADMIN,
                "YARDMANAGER" => YARD_MANAGER,
                "YARDJOCKEY" => YARD_JOCKEY,
                "GATESECURITY" => GATE_SECURITY,
                "DRIVER" => DRIVER,
                "VIEWONLY" => VIEW_ONLY,
                "USER" => VIEW_ONLY,
                _ => raw
            };
        }
    }
}
