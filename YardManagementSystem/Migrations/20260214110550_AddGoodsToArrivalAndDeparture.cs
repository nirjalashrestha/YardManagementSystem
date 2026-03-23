using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace YardManagementSystem.Migrations
{
    /// <inheritdoc />
    public partial class AddGoodsToArrivalAndDeparture : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "GoodsId",
                table: "Departures",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "GoodsId",
                table: "Arrivals",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Departures_GoodsId",
                table: "Departures",
                column: "GoodsId");

            migrationBuilder.CreateIndex(
                name: "IX_Arrivals_GoodsId",
                table: "Arrivals",
                column: "GoodsId");

            migrationBuilder.AddForeignKey(
                name: "FK_Arrivals_Goods_GoodsId",
                table: "Arrivals",
                column: "GoodsId",
                principalTable: "Goods",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_Departures_Goods_GoodsId",
                table: "Departures",
                column: "GoodsId",
                principalTable: "Goods",
                principalColumn: "Id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Arrivals_Goods_GoodsId",
                table: "Arrivals");

            migrationBuilder.DropForeignKey(
                name: "FK_Departures_Goods_GoodsId",
                table: "Departures");

            migrationBuilder.DropIndex(
                name: "IX_Departures_GoodsId",
                table: "Departures");

            migrationBuilder.DropIndex(
                name: "IX_Arrivals_GoodsId",
                table: "Arrivals");

            migrationBuilder.DropColumn(
                name: "GoodsId",
                table: "Departures");

            migrationBuilder.DropColumn(
                name: "GoodsId",
                table: "Arrivals");
        }
    }
}
