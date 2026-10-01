import { useCallback, useEffect, useState } from "react";
import type { ReactNode } from "react";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import Divider from "@mui/material/Divider";
import Typography from "@mui/material/Typography";
import { BaseButton } from "~/components/global/BaseButton";
import { BaseButtonGroup } from "~/components/global/BaseButtonGroup";
import { BaseCardSectionTitle } from "~/components/global/BaseCardSectionTitle";
import { BaseContainer } from "~/components/global/BaseContainer";
import { BasePageTitle, BasePageTitleImage } from "~/components/global/BasePageTitle";
import { GroupMealPlanRuleForm } from "~/components/Domain/Household/GroupMealPlanRuleForm";
import type { GroupMealPlanRuleFormValue } from "~/components/Domain/Household/GroupMealPlanRuleForm";
import { RecipeChips } from "~/components/Domain/Recipe/RecipeChips";
import { useUserApi } from "~/hooks/api";
import { useI18n } from "~/hooks/use-global-i18n";
import { useSeoMeta } from "~/hooks/use-seo-meta";
import { icons } from "~/lib/icons";
import type { PlanRulesCreate, PlanRulesOut } from "~/lib/api/types/meal-plan";
import type { RecipeCategory, RecipeTag } from "~/lib/api/types/recipe";

// Older rule payloads carried organizer lists; the Vue template still rendered them when present
type RuleOut = PlanRulesOut & {
  categories?: RecipeCategory[];
  tags?: RecipeTag[];
  households?: { id: string; name: string }[];
};

const emptyRule = (): PlanRulesCreate => ({ entryType: "unset", day: "unset", queryFilterString: "" });

export default function MealPlanSettingsPage() {
  const api = useUserApi();
  const i18n = useI18n();

  useSeoMeta({ title: i18n.t("meal-plan.meal-plan-settings") });

  // ======================================================
  // Manage All
  const [editState, setEditState] = useState<Record<string, boolean>>({});
  const [allRules, setAllRules] = useState<RuleOut[]>([]);

  const toggleEditState = (id: string) => setEditState(prev => ({ ...prev, [id]: !prev[id] }));

  const refreshAll = useCallback(async () => {
    const { data } = await api.mealplanRules.getAll();
    if (data) {
      setAllRules(data.items ?? []);
    }
  }, [api]);

  useEffect(() => {
    void refreshAll();
  }, [refreshAll]);

  // ======================================================
  // Creating Rules
  const [createDataFormKey, setCreateDataFormKey] = useState(0);
  const [createData, setCreateData] = useState<PlanRulesCreate>(emptyRule);

  async function createRule() {
    const { data } = await api.mealplanRules.createOne(createData);
    if (data) {
      void refreshAll();
      setCreateData(emptyRule());
      setCreateDataFormKey(k => k + 1);
    }
  }

  async function deleteRule(ruleId: string) {
    const { data } = await api.mealplanRules.deleteOne(ruleId);
    if (data) {
      void refreshAll();
    }
  }

  async function updateRule(rule: PlanRulesOut) {
    const { data } = await api.mealplanRules.updateOne(rule.id, rule);
    if (data) {
      void refreshAll();
      toggleEditState(rule.id);
    }
  }

  function updateRuleForm(id: string, update: (prev: GroupMealPlanRuleFormValue) => GroupMealPlanRuleFormValue) {
    setAllRules(prev => prev.map((r) => {
      if (r.id !== id) return r;
      const next = update({ day: r.day ?? "unset", entryType: r.entryType ?? "unset", queryFilterString: r.queryFilterString ?? "" });
      return { ...r, ...next } as RuleOut;
    }));
  }

  const anyText = (text: string) => <Typography variant="body2" sx={{ m: 0, px: 0, pt: 0, pb: 1.5 }}>{text}</Typography>;
  const heading = (text: ReactNode) => <Typography component="h4" variant="subtitle1" sx={{ py: 0.5, fontWeight: "bold" }}>{text}</Typography>;

  return (
    <BaseContainer>
      <BasePageTitle
        divider
        header={<BasePageTitleImage src="/svgs/manage-cookbooks.svg" maxWidth={100} maxHeight={100} />}
        title={i18n.t("meal-plan.meal-plan-rules")}
      >
        {i18n.t("meal-plan.meal-plan-rules-description")}
      </BasePageTitle>

      <Card>
        <Typography variant="h5" sx={{ px: 2, pt: 2, pb: 1 }}>{i18n.t("meal-plan.new-rule")}</Typography>
        <Divider sx={{ mx: 1 }} />
        <CardContent>
          {i18n.t("meal-plan.new-rule-description")}
          <Box sx={{ mt: 1 }}>
            <GroupMealPlanRuleForm
              key={createDataFormKey}
              value={{ day: createData.day ?? "unset", entryType: createData.entryType ?? "unset", queryFilterString: createData.queryFilterString ?? "" }}
              onChange={update => setCreateData((prev) => {
                const next = update({ day: prev.day ?? "unset", entryType: prev.entryType ?? "unset", queryFilterString: prev.queryFilterString ?? "" });
                return { ...prev, ...next } as PlanRulesCreate;
              })}
            />
          </Box>
        </CardContent>
        <Box sx={{ display: "flex", justifyContent: "flex-end", p: 1 }}>
          <BaseButton create disabled={!createData.queryFilterString} onClick={() => void createRule()} />
        </Box>
      </Card>

      <section>
        <Box sx={{ mt: 5 }}>
          <BaseCardSectionTitle title={i18n.t("meal-plan.recipe-rules")} />
        </Box>
        <div>
          {allRules.map(rule => (
            <Card key={rule.id} className="left-border" sx={{ my: 1 }}>
              <Box sx={{ display: "flex", alignItems: "center", px: 2, pt: 2, pb: 0.5 }}>
                <Typography variant="h6" sx={{ flexGrow: 1 }}>
                  {rule.day === "unset" ? i18n.t("meal-plan.applies-to-all-days") : i18n.t("meal-plan.applies-on-days", [rule.day])}
                  {" "}
                  {rule.entryType === "unset" ? i18n.t("meal-plan.for-all-meal-types") : i18n.t("meal-plan.for-type-meal-types", [rule.entryType])}
                </Typography>
                <BaseButtonGroup
                  buttons={[
                    { icon: icons.edit, text: i18n.t("general.edit"), event: "edit" },
                    { icon: icons.delete, text: i18n.t("general.delete"), event: "delete" },
                  ]}
                  onEvent={(event) => {
                    if (event === "delete") void deleteRule(rule.id);
                    if (event === "edit") toggleEditState(rule.id);
                  }}
                />
              </Box>
              <CardContent>
                {!editState[rule.id]
                  ? (
                      <>
                        {rule.categories && (
                          <div>
                            {heading(`${i18n.t("category.categories")}:`)}
                            {rule.categories.length
                              ? <Box sx={{ pb: 1.5 }}><RecipeChips items={rule.categories} small /></Box>
                              : anyText(i18n.t("meal-plan.any-category"))}
                          </div>
                        )}
                        {rule.tags && (
                          <div>
                            {heading(`${i18n.t("tag.tags")}:`)}
                            {rule.tags.length
                              ? <Box sx={{ pb: 1.5 }}><RecipeChips items={rule.tags} urlPrefix="tags" small /></Box>
                              : anyText(i18n.t("meal-plan.any-tag"))}
                          </div>
                        )}
                        {rule.households && (
                          <div>
                            {heading(`${i18n.t("household.households")}:`)}
                            {rule.households.length
                              ? (
                                  <div>
                                    {rule.households.map(household => (
                                      <Chip key={household.id} label={household.name} color="accent" size="small" sx={{ m: 0.5, borderRadius: 1 }} />
                                    ))}
                                  </div>
                                )
                              : anyText(i18n.t("meal-plan.any-household"))}
                          </div>
                        )}
                      </>
                    )
                  : (
                      <>
                        <GroupMealPlanRuleForm
                          value={{ day: rule.day ?? "unset", entryType: rule.entryType ?? "unset", queryFilterString: rule.queryFilterString ?? "" }}
                          onChange={update => updateRuleForm(rule.id, update)}
                          queryFilter={rule.queryFilter}
                        />
                        <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
                          <BaseButton update disabled={!rule.queryFilterString} onClick={() => void updateRule(rule)} />
                        </Box>
                      </>
                    )}
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </BaseContainer>
  );
}
