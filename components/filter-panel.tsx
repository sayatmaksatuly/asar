import { SlidersHorizontal } from "lucide-react";
import { Input, Select, buttonStyles } from "@/components/ui/primitives";
import type { Dictionary, Locale } from "@/lib/i18n";
import type { Category, CityOption, DistrictOption } from "@/types/domain";

interface FilterPanelProps {
  locale: Locale;
  dictionary: Dictionary;
  categories: Category[];
  cities: CityOption[];
  districts: DistrictOption[];
  values: Record<string, string | undefined>;
}

function Filters({ locale, dictionary, categories, cities, districts, values }: FilterPanelProps) {
  const cityId = Number(values.city_id) || 0;
  const districtOptions = cityId ? districts.filter((item) => item.city_id === cityId) : [];
  return (
    <div className="grid gap-4">
      <label className="field-label"><span>{dictionary.requests.search}</span><Input name="q" defaultValue={values.q} type="search" /></label>
      <label className="field-label"><span>{dictionary.requests.category}</span><Select name="category" defaultValue={values.category}><option value="">{dictionary.common.all}</option>{categories.map((category) => <option key={category.id} value={category.slug}>{locale === "ru" ? category.name_ru : category.name_kk}</option>)}</Select></label>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
        <label className="field-label"><span>{dictionary.requests.city}</span><Select name="city_id" defaultValue={values.city_id}><option value="">{dictionary.common.all}</option>{cities.map((city) => <option key={city.id} value={city.id}>{locale === "ru" ? city.name_ru : city.name_kk}</option>)}</Select></label>
        <label className="field-label"><span>{dictionary.requests.district}</span><Select name="district_id" defaultValue={values.district_id} disabled={!cityId}><option value="">{dictionary.common.all}</option>{districtOptions.map((district) => <option key={district.id} value={district.id}>{locale === "ru" ? district.name_ru : district.name_kk}</option>)}</Select></label>
      </div>
      <label className="field-label"><span>{dictionary.requests.urgency}</span><Select name="urgency" defaultValue={values.urgency}><option value="">{dictionary.common.all}</option>{Object.entries(dictionary.urgency).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</Select></label>
      <label className="field-label"><span>{dictionary.requests.format}</span><Select name="format" defaultValue={values.format}><option value="">{dictionary.common.all}</option>{Object.entries(dictionary.helpFormat).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</Select></label>
      <label className="field-label"><span>{dictionary.requests.contentLanguage}</span><Select name="language" defaultValue={values.language}><option value="">{dictionary.common.all}</option><option value="ru">{dictionary.common.languageRussian}</option><option value="kk">{dictionary.common.languageKazakh}</option></Select></label>
      <div className="grid grid-cols-2 gap-3"><button className={buttonStyles("primary")} type="submit"><SlidersHorizontal size={18} />{dictionary.requests.filters}</button><a className={buttonStyles("ghost")} href={`/${locale}/requests`}>{dictionary.requests.reset}</a></div>
    </div>
  );
}

export function FilterPanel(props: FilterPanelProps) {
  return <><form className="sticky top-24 hidden rounded-3xl border border-[var(--line)] bg-white p-5 shadow-[var(--shadow-sm)] lg:block" method="get"><Filters {...props} /></form><details className="mobile-filters lg:hidden"><summary><SlidersHorizontal size={20} />{props.dictionary.requests.openFilters}</summary><form method="get" className="border-t border-[var(--line)] p-5"><Filters {...props} /></form></details></>;
}
