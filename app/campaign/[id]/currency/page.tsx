import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { getOrCreateCharacter, updateCoins, convertCoins } from "@/lib/actions";
import { COINS, COIN_ABBR, COIN_LABEL, COIN_VALUE_CP, coinRate } from "@/lib/dnd";

export const dynamic = "force-dynamic";

export default async function CurrencyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const campaign = await prisma.campaign.findUnique({ where: { id } });
  if (!campaign) notFound();

  const user = await requireUser();
  const character = await getOrCreateCharacter(id, user.id);
  const totalCp = COINS.reduce((sum, coin) => sum + character[coin] * COIN_VALUE_CP[coin], 0);
  const totalGp = totalCp / COIN_VALUE_CP.gold;

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold">Currency</h2>

      {/* purse */}
      <form action={updateCoins.bind(null, character.id, id)} className="card grid gap-3 p-4 sm:grid-cols-5">
        {COINS.map((coin) => (
          <label key={coin} className="text-center text-sm">
            <span className="text-neutral-400">
              {COIN_LABEL[coin]} ({COIN_ABBR[coin]})
            </span>
            <input
              name={coin}
              type="number"
              min={0}
              defaultValue={character[coin]}
              className="input mt-1 text-center text-lg font-bold"
            />
          </label>
        ))}
        <button className="btn btn-primary sm:col-span-5">Save</button>
      </form>

      <p className="text-sm text-neutral-400">
        Total wealth: <span className="font-semibold text-amber-400">{totalGp.toFixed(2)} gp</span> equivalent
      </p>

      {/* converter */}
      <section className="card space-y-3 p-4">
        <h3 className="font-semibold text-neutral-200">Convert Coins</h3>
        <p className="text-xs text-neutral-500">Exchanges coins in your purse — spends from one type, adds to another.</p>
        <form action={convertCoins.bind(null, character.id, id)} className="flex flex-wrap items-end gap-3">
          <label className="text-sm">
            <span className="text-neutral-400">Amount</span>
            <input name="amount" type="number" min={1} defaultValue={1} className="input mt-1 w-24" />
          </label>
          <label className="text-sm">
            <span className="text-neutral-400">From</span>
            <select name="from" defaultValue="gold" className="input mt-1">
              {COINS.map((coin) => (
                <option key={coin} value={coin}>
                  {COIN_LABEL[coin]} ({COIN_ABBR[coin]})
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            <span className="text-neutral-400">To</span>
            <select name="to" defaultValue="silver" className="input mt-1">
              {COINS.map((coin) => (
                <option key={coin} value={coin}>
                  {COIN_LABEL[coin]} ({COIN_ABBR[coin]})
                </option>
              ))}
            </select>
          </label>
          <button className="btn btn-primary">Convert</button>
        </form>
      </section>

      {/* standard exchange rate reference */}
      <section className="card space-y-3 p-4">
        <h3 className="font-semibold text-neutral-200">Standard Exchange Rates</h3>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[480px] text-center text-sm">
            <thead>
              <tr>
                <th className="p-2 text-left text-xs uppercase tracking-wide text-neutral-500" />
                {COINS.map((coin) => (
                  <th key={coin} className="p-2 text-xs uppercase tracking-wide text-neutral-500">
                    {COIN_ABBR[coin]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {COINS.map((row) => (
                <tr key={row} className="border-t border-white/10">
                  <td className="p-2 text-left font-semibold text-neutral-300">
                    {COIN_LABEL[row]} ({COIN_ABBR[row]})
                  </td>
                  {COINS.map((col) => (
                    <td key={col} className={`p-2 ${row === col ? "text-neutral-600" : "text-neutral-200"}`}>
                      {coinRate(row, col)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
