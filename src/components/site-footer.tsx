import { FamilyFooter } from "@/components/ui/family-footer";
import { MethodDrawer } from "@/components/method-drawer";
import { formatDate } from "@/lib/format-date";
import { snapshot } from "@/data/snapshot";

/*
  The product footer: the family three-zone layout with this product's
  data attribution in the required credits slot and the method drawer
  in the colophon's extra slot (the disclaimer slot stays unused).
*/
export function SiteFooter() {
  const cbs = snapshot.sources.cbs;
  const eurostat = snapshot.sources.eurostat;
  const dji = snapshot.sources.dji;
  return (
    <FamilyFooter
      credits={
        <>
          <p>
            <a
              href={cbs.url}
              className="underline underline-offset-4 hover:text-foreground"
            >
              CBS StatLine
            </a>{" "}
            ({cbs.license}, retrieved {formatDate(cbs.retrievedAt)}; human-facing
            table pages linked in the method drawer; CBS publishes without an
            actuality guarantee).
          </p>
          <p className="mt-1">
            <a
              href={eurostat.page}
              className="underline underline-offset-4 hover:text-foreground"
            >
              Eurostat, crim_pris_cap
            </a>{" "}
            ({eurostat.license}, retrieved {formatDate(eurostat.retrievedAt)}).
          </p>
          <p className="mt-1">
            <a
              href={dji.url}
              className="underline underline-offset-4 hover:text-foreground"
            >
              {dji.source}, {dji.document}
            </a>{" "}
            ({dji.version}, data year {dji.dataYear}).
          </p>
        </>
      }
      extra={<MethodDrawer />}
    />
  );
}
