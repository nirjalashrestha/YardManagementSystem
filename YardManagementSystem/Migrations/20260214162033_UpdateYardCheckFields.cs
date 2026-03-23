using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace YardManagementSystem.Migrations
{
    /// <inheritdoc />
    public partial class UpdateYardCheckFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_YardChecks_Carriers_CarrierId",
                table: "YardChecks");

            migrationBuilder.DropIndex(
                name: "IX_YardChecks_CarrierId",
                table: "YardChecks");

            migrationBuilder.DropIndex(
                name: "IX_YardChecks_FacilityId",
                table: "YardChecks");

            migrationBuilder.DropColumn(
                name: "CarrierId",
                table: "YardChecks");

            migrationBuilder.DropColumn(
                name: "Reason",
                table: "YardChecks");

            migrationBuilder.AlterColumn<string>(
                name: "TrailerNumber",
                table: "YardChecks",
                type: "nvarchar(60)",
                maxLength: 60,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(50)",
                oldMaxLength: 50);

            migrationBuilder.AlterColumn<string>(
                name: "Time",
                table: "YardChecks",
                type: "nvarchar(5)",
                maxLength: 5,
                nullable: false,
                oldClrType: typeof(TimeOnly),
                oldType: "time");

            migrationBuilder.AlterColumn<string>(
                name: "Status",
                table: "YardChecks",
                type: "nvarchar(30)",
                maxLength: 30,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(50)",
                oldMaxLength: 50);

            migrationBuilder.AlterColumn<string>(
                name: "Date",
                table: "YardChecks",
                type: "nvarchar(10)",
                maxLength: 10,
                nullable: false,
                oldClrType: typeof(DateOnly),
                oldType: "date");

            migrationBuilder.AlterColumn<Guid>(
                name: "Id",
                table: "YardChecks",
                type: "uniqueidentifier",
                nullable: false,
                oldClrType: typeof(int),
                oldType: "int")
                .OldAnnotation("SqlServer:Identity", "1, 1");

            migrationBuilder.AddColumn<DateTime>(
                name: "CreatedAtUtc",
                table: "YardChecks",
                type: "datetime2",
                nullable: false,
                defaultValue: new DateTime(1, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified));

            migrationBuilder.AddColumn<string>(
                name: "CreatedBy",
                table: "YardChecks",
                type: "nvarchar(160)",
                maxLength: 160,
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "UpdatedAtUtc",
                table: "YardChecks",
                type: "datetime2",
                nullable: false,
                defaultValue: new DateTime(1, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified));

            migrationBuilder.CreateIndex(
                name: "IX_YardChecks_FacilityId_Date_Time",
                table: "YardChecks",
                columns: new[] { "FacilityId", "Date", "Time" });

            migrationBuilder.CreateIndex(
                name: "IX_YardChecks_Status",
                table: "YardChecks",
                column: "Status");

            migrationBuilder.CreateIndex(
                name: "IX_YardChecks_TrailerNumber",
                table: "YardChecks",
                column: "TrailerNumber");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_YardChecks_FacilityId_Date_Time",
                table: "YardChecks");

            migrationBuilder.DropIndex(
                name: "IX_YardChecks_Status",
                table: "YardChecks");

            migrationBuilder.DropIndex(
                name: "IX_YardChecks_TrailerNumber",
                table: "YardChecks");

            migrationBuilder.DropColumn(
                name: "CreatedAtUtc",
                table: "YardChecks");

            migrationBuilder.DropColumn(
                name: "CreatedBy",
                table: "YardChecks");

            migrationBuilder.DropColumn(
                name: "UpdatedAtUtc",
                table: "YardChecks");

            migrationBuilder.AlterColumn<string>(
                name: "TrailerNumber",
                table: "YardChecks",
                type: "nvarchar(50)",
                maxLength: 50,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(60)",
                oldMaxLength: 60);

            migrationBuilder.AlterColumn<TimeOnly>(
                name: "Time",
                table: "YardChecks",
                type: "time",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(5)",
                oldMaxLength: 5);

            migrationBuilder.AlterColumn<string>(
                name: "Status",
                table: "YardChecks",
                type: "nvarchar(50)",
                maxLength: 50,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(30)",
                oldMaxLength: 30);

            migrationBuilder.AlterColumn<DateOnly>(
                name: "Date",
                table: "YardChecks",
                type: "date",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(10)",
                oldMaxLength: 10);

            migrationBuilder.AlterColumn<int>(
                name: "Id",
                table: "YardChecks",
                type: "int",
                nullable: false,
                oldClrType: typeof(Guid),
                oldType: "uniqueidentifier")
                .Annotation("SqlServer:Identity", "1, 1");

            migrationBuilder.AddColumn<Guid>(
                name: "CarrierId",
                table: "YardChecks",
                type: "uniqueidentifier",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"));

            migrationBuilder.AddColumn<string>(
                name: "Reason",
                table: "YardChecks",
                type: "nvarchar(500)",
                maxLength: 500,
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_YardChecks_CarrierId",
                table: "YardChecks",
                column: "CarrierId");

            migrationBuilder.CreateIndex(
                name: "IX_YardChecks_FacilityId",
                table: "YardChecks",
                column: "FacilityId");

            migrationBuilder.AddForeignKey(
                name: "FK_YardChecks_Carriers_CarrierId",
                table: "YardChecks",
                column: "CarrierId",
                principalTable: "Carriers",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }
    }
}
