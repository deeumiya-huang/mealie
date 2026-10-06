import { useEffect, useState } from "react";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardActions from "@mui/material/CardActions";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import Container from "@mui/material/Container";
import Divider from "@mui/material/Divider";
import Typography from "@mui/material/Typography";
import { BaseButton } from "@/components/global/BaseButton";
import { BaseButtonGroup } from "@/components/global/BaseButtonGroup";
import { BaseCardSectionTitle } from "@/components/global/BaseCardSectionTitle";
import { BaseImg } from "@/components/global/BaseImg";
import { BasePageTitle } from "@/components/global/BasePageTitle";
import { GroupMealPlanRuleForm } from "@/components/Domain/Household/GroupMealPlanRuleForm";
import { RecipeChips } from "@/components/Domain/Recipe/RecipeChips";
import { useUserApi } from "@/hooks/api";
import { usePageTitle } from "@/hooks/utils";
import { useI18n } from "@/i18n";
import type { PlanRulesCreate, PlanRulesDay, PlanRulesOut, PlanRulesType } from "@/lib/api/types/meal-plan";
import type { RecipeCategory, RecipeTag } from "@/lib/api/types/recipe";
import { icons } from "@/lib/icons";

/** Older servers also sent the organizers a rule applies to; they are shown when present. */
type RuleWithOrganizers = PlanRulesOut & {
  categories?: RecipeCategory[];
  tags?: RecipeTag[];
  households?: { id: string; name: string }[];
};

const EMPTY_RULE: PlanRulesCreate = {
  entryType: "unset",
  day: "unset",
  queryFilterString: "",
};

export default function HouseholdMealplanSettingsPage() {
  const { t } = useI18n();
  const api = useUserApi();

  usePageTitle(t("meal-plan.meal-plan-settings"));

  // ======================================================
  // Manage All
  const [editState, setEditState] = useState<Record<string, boolean>>({});
  const [allRules, setAllRules] = useState<RuleWithOrganizers[]>([]);

  function toggleEditState(id: string) {
    setEditState(current => ({ ...current, [id]: !current[id] }));
  }

  async function refreshAll() {
    const { data } = await api.mealplanRules.getAll();

    if (data) {
      setAllRules(data.items ?? []);
    }
  }

  useEffect(() => {
    let active = true;
    void (async () => {
      const { data } = await api.mealplanRules.getAll();
      if (active && data) {
        setAllRules(data.items ?? []);
      }
    })();
    return () => {
      active = false;
    };
  }, [api]);

  function updateRuleData(index: number, change: Partial<PlanRulesOut>) {
    setAllRules(current => current.map((rule, i) => (i === index ? { ...rule, ...change } : rule)));
  }

  // ======================================================
  // Creating Rules

  const [createDataFormKey, setCreateDataFormKey] = useState(0);
  const [createData, setCreateData] = useState<PlanRulesCreate>({ ...EMPTY_RULE });

  async function createRule() {
    const { data } = await api.mealplanRules.createOne(createData);
    if (data) {
      void refreshAll();
      setCreateData({ ...EMPTY_RULE });
      setCreateDataFormKey(key => key + 1);
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

  function anyText(text: string) {
    return (
      <Typography component="div" sx={{ m: 0, px: 0, pt: 0, pb: 1.5, fontSize: "0.875rem", color: "accent.main" }}>
        {text}
      </Typography>
    );
  }

  return (
    <Container sx={{ maxWidth: "1100px !important" }}>
      <BasePageTitle
        divider
        header={<BaseImg width="100%" maxHeight={100} maxWidth={100} src="/svgs/manage-cookbooks.svg" />}
        title={t("meal-plan.meal-plan-rules")}
      >
        {t("meal-plan.meal-plan-rules-description")}
      </BasePageTitle>

      <Card>
        <Typography variant="h5" component="div" sx={{ px: 2, py: 1.5 }}>
          {t("meal-plan.new-rule")}
        </Typography>
        <Divider sx={{ mx: 1 }} />
        <CardContent>
          {t("meal-plan.new-rule-description")}

          <Box sx={{ mt: 1 }}>
            <GroupMealPlanRuleForm
              key={createDataFormKey}
              day={createData.day}
              onDayChange={day => setCreateData(current => ({ ...current, day: day as PlanRulesDay }))}
              entryType={createData.entryType}
              onEntryTypeChange={entryType => setCreateData(current => ({ ...current, entryType: entryType as PlanRulesType }))}
              queryFilterString={createData.queryFilterString}
              onQueryFilterStringChange={queryFilterString => setCreateData(current => ({ ...current, queryFilterString }))}
            />
          </Box>
        </CardContent>
        <CardActions sx={{ justifyContent: "flex-end" }}>
          <BaseButton
            create
            disabled={!createData.queryFilterString}
            onClick={() => void createRule()}
          />
        </CardActions>
      </Card>

      <section>
        <Box sx={{ mt: 10 }}>
          <BaseCardSectionTitle title={t("meal-plan.recipe-rules")} />
        </Box>
        <div>
          {allRules.map((rule, idx) => (
            <div key={rule.id}>
              <Card sx={{ my: 1, borderLeft: "5px solid", borderLeftColor: "primary.main" }}>
                <Typography variant="h5" component="div" sx={{ px: 2, pt: 1.5, pb: 0.5, display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                  <span>
                    {rule.day === "unset" ? t("meal-plan.applies-to-all-days") : t("meal-plan.applies-on-days", [rule.day])}
                  </span>
                  <span>
                    {rule.entryType === "unset" ? t("meal-plan.for-all-meal-types") : t("meal-plan.for-type-meal-types", [rule.entryType])}
                  </span>
                  <Box component="span" sx={{ ml: "auto" }}>
                    <BaseButtonGroup
                      buttons={[
                        {
                          icon: icons.edit,
                          text: t("general.edit"),
                          event: "edit",
                        },
                        {
                          icon: icons.delete,
                          text: t("general.delete"),
                          event: "delete",
                        },
                      ]}
                      onAction={(event) => {
                        if (event === "delete") {
                          void deleteRule(rule.id);
                        }
                        else if (event === "edit") {
                          toggleEditState(rule.id);
                        }
                      }}
                    />
                  </Box>
                </Typography>
                <CardContent>
                  {!editState[rule.id]
                    ? (
                        <>
                          {rule.categories && (
                            <div>
                              <Box component="h4" sx={{ py: 0.5 }}>
                                {t("category.categories")}
                                :
                              </Box>
                              {rule.categories.length
                                ? (
                                    <Box sx={{ pb: 1.5 }}>
                                      <RecipeChips items={rule.categories} small />
                                    </Box>
                                  )
                                : anyText(t("meal-plan.any-category"))}
                            </div>
                          )}

                          {rule.tags && (
                            <div>
                              <Box component="h4" sx={{ py: 0.5 }}>
                                {t("tag.tags")}
                                :
                              </Box>
                              {rule.tags.length
                                ? (
                                    <Box sx={{ pb: 1.5 }}>
                                      <RecipeChips items={rule.tags} urlPrefix="tags" small />
                                    </Box>
                                  )
                                : anyText(t("meal-plan.any-tag"))}
                            </div>
                          )}
                          {rule.households && (
                            <div>
                              <Box component="h4" sx={{ py: 0.5 }}>
                                {t("household.households")}
                                :
                              </Box>
                              {rule.households.length
                                ? (
                                    <div>
                                      {rule.households.map(household => (
                                        <Chip
                                          key={household.id}
                                          size="small"
                                          color="accent"
                                          label={household.name}
                                          sx={{ m: 0.5, borderRadius: 1 }}
                                        />
                                      ))}
                                    </div>
                                  )
                                : anyText(t("meal-plan.any-household"))}
                            </div>
                          )}
                        </>
                      )
                    : (
                        <>
                          <GroupMealPlanRuleForm
                            day={rule.day}
                            onDayChange={day => updateRuleData(idx, { day: day as PlanRulesDay })}
                            entryType={rule.entryType}
                            onEntryTypeChange={entryType => updateRuleData(idx, { entryType: entryType as PlanRulesType })}
                            queryFilterString={rule.queryFilterString}
                            onQueryFilterStringChange={queryFilterString => updateRuleData(idx, { queryFilterString })}
                            queryFilter={rule.queryFilter}
                          />
                          <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
                            <BaseButton
                              update
                              disabled={!rule.queryFilterString}
                              onClick={() => void updateRule(rule)}
                            />
                          </Box>
                        </>
                      )}
                </CardContent>
              </Card>
            </div>
          ))}
        </div>
      </section>
    </Container>
  );
}
