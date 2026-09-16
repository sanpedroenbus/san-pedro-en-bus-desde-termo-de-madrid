import type { Problem } from "@/lib/domain/heat";
import type { MetroLine } from "@/lib/domain/lines";
import type { Report } from "@/lib/domain/reports";

const now = new Date();

const hotCars = ["51", "54", "12", "73", "41"];
const l5Cars = ["02", "300", "120", "44"];
const normalCars = ["201", "304", "12", "66", "10", "204"];

function hoursAgo(hours: number) {
  return new Date(now.getTime() - hours * 3_600_000);
}

function makeReport(index: number, line: MetroLine, problems: Problem[], hours: number, car: string | null): Report {
  return {
    id: `seed-${index}`,
    line,
    car,
    problems,
    createdAt: hoursAgo(hours),
    hiddenAt: null,
  };
}

export const seedReports: Report[] = [
  ...Array.from({ length: 24 }, (_, index) =>
    makeReport(index, "LA_CAMPINA", index % 5 === 0 ? ["hacinados"] : ["chofer_trato_mal", "conduccion_temeraria"], index * 0.55, hotCars[index % hotCars.length]),
  ),
  ...Array.from({ length: 17 }, (_, index) =>
    makeReport(100 + index, "SALITRILLOS", index % 4 === 0 ? ["hacinados"] : ["no_hizo_parada", "horario_sin_servicio"], index * 0.8, l5Cars[index % l5Cars.length]),
  ),
  ...Array.from({ length: 16 }, (_, index) =>
    makeReport(
      200 + index,
      (["GRANADILLA", "SAN_RAMON", "VARGAS_ARAYA", "SABANILLA"] as MetroLine[])[index % 4],
      index % 6 === 0 ? ["hacinados"] : [],
      index * 2.5,
      index % 3 === 0 ? null : normalCars[index % normalCars.length],
    ),
  ),
  makeReport(300, "LA_CAMPINA", [], 3.2, "51"),
  makeReport(301, "SALITRILLOS", [], 4.4, null),
  makeReport(302, "BARRIO_PINTO", ["olia_mal_sucio"], 1.6, "73"),
];
