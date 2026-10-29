import { useState } from 'react';
import { View } from 'react-native';
import { changeOwnPassword, passwordRules } from '@/data/auth-api';
import { errorMessage } from '@/data/errors';
import { ltr } from '@/i18n/copy';
import { usePreferences } from '@/providers/preferences';
import { Button, Card, ErrorLine, Field, Icon, Label, TextLink, Title } from '@/ui/components';
import { useBranch } from './state';
import { Footer, Muted, PageFrame, styles, Tile } from './shared';

/**
 * «تغيير كلمة المرور» — the branch choosing to rotate a password that already works.
 *
 * The canvas draws this as the *same* screen as the forced change, switched by its `change` flag:
 * a `curPass` field above the two new ones, a fourth rule («أدخل كلمة المرور الحالية»), a back
 * arrow in the header, `pwdChangeT`/`pwdChangeSub` as the title and sub, and `savePass2` on the
 * footer button. Everything else — the three rules, the show/hide link, the layout — is the screen
 * already at `src/app/change-password.tsx`.
 *
 * It is a page of the branch app and not that route, for two reasons. The route is gated:
 * `AuthGate` sends anyone whose `must_change_password` is false straight back to `/branch`, so a
 * voluntary visit there is bounced. And the canvas gives this one a back arrow into the account
 * tab, which is branch navigation, not the router's. So the forced route keeps its own screen and
 * its own contract, untouched; this is the branch's.
 *
 * ## The body
 *
 * Four pieces of local state — `current`, `password`, `confirmation`, `visible` — plus `busy` and
 * `error`, and `showErr` the way `create.tsx` uses it: the button is never disabled for an invalid
 * form, pressing it reveals what is wrong. (The canvas disables it; `create.tsx` established the
 * other way for this app, after a footer button that looked broken, and that is the one to match.)
 *
 * `passwordRules(password, confirmation)` from `auth-api` gives the first three, in order: eight
 * characters, a letter and a digit, the confirmation matches. The fourth is
 * `current.length > 0` — the canvas's `r0`, appended *after* the three, which is where the canvas
 * puts it (`rules.concat(change ? [rule(r0, t.r0)] : [])`).
 *
 * ## The screen
 *
 * `PageFrame` with `title={t.pwdChangeT}`, `onBack={data.back}`, and a `Footer` holding one
 * `Button variant="branch"`: `busy={busy}`, label `t.saving` while busy and `t.savePass2`
 * otherwise.
 *
 * In the body, above the card, the canvas's own heading block (`gap: 8`, `padding: '4px 4px 0'`):
 * a 56px `Tile` with the `lock` icon at 28 on `colors.accentSoft` in `colors.accentText` and
 * `borderRadius: 18`, then `pwdChangeT` as a `Title` at 24, then `pwdChangeSub` as a `Muted` sub.
 *
 * Then one `Card` (`padding: 18`, `gap: 16`) holding, in order:
 * - `Field label={t.curPass}` — `secureTextEntry={!visible}`, `autoComplete="current-password"`,
 *   `autoCapitalize="none"`, `autoCorrect={false}`, `editable={!busy}`, and its `error` is
 *   `showErr && !current ? t.r0 : undefined`.
 * - `Field label={t.newPass}` and `Field label={t.confPass}` — the same props with
 *   `autoComplete="new-password"`, the second submitting on `onSubmitEditing`.
 * - a `TextLink` (not a `Button`) for `visible ? t.hidePw : t.showPw`, `alignSelf: 'flex-start'`,
 *   which is the canvas's `class="link"`.
 * - the rules, under a 12px top border in `colors.line`, `gap: 8`: each a row of `gap: 10` with a
 *   22px circle — `borderRadius: 11`, `colors.successSoft` when met and `colors.surface2` when
 *   not — holding `check` or `dash` at 14 in `colors.success` / `colors.muted`, then the label as
 *   Tajawal_700Bold 14 in that same colour. Give each row `accessibilityRole="checkbox"` with
 *   `accessibilityState={{ checked }}` and the label as its `accessibilityLabel`, the way the
 *   forced screen does.
 * - `error` as an `ErrorLine` at the foot of the card.
 *
 * ## Saving
 *
 * On press: if any rule is unmet, `setShowErr(true)` and stop. Otherwise `busy`, clear `error`,
 * `await changeOwnPassword(current, password)`, and on success leave for the account tab with the
 * approved toast — `data.showToast(t.passSaved)` then `data.back()`, which is the same pair the
 * location screen's confirmation uses. On failure, `setError(error)` and stay, with every field
 * still filled: `errorMessage` already words both refusals («كلمة المرور الحالية غير صحيحة» and
 * «اختر كلمة مرور مختلفة عن الحالية») and anything else falls through to the generic failure.
 *
 * Nothing is cleared on failure and nothing is remembered on success — there is no draft here.
 */
export function PasswordScreen() {
  const data = useBranch();
  const { colors, copy } = usePreferences();
  const t = copy.branch;
  const [current, setCurrent] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [showErr, setShowErr] = useState(false);
  const rules = [...passwordRules(password, confirmation), current.length > 0];
  const labels = [t.r1.replace(/\d+/g, ltr), t.r2, t.r3, t.r0];
  async function save() {
    if (busy) return;
    if (!rules.every(Boolean)) { setShowErr(true); return; }
    setBusy(true); setError(null);
    try {
      await changeOwnPassword(current, password);
      data.showToast(t.passSaved); data.back();
    } catch (error) { setError(error); }
    finally { setBusy(false); }
  }
  return <PageFrame title={t.pwdChangeT} onBack={data.back} footer={<Footer>
    <Button variant="branch" busy={busy} disabled={busy} label={busy ? t.saving : t.savePass2}
      onPress={() => void save()} />
  </Footer>}>
    <View style={{ gap: 8, paddingHorizontal: 4, paddingTop: 4 }}>
      <Tile icon="lock" size={56} iconSize={28} radius={18} background={colors.accentSoft} color={colors.accentText} />
      <Title style={styles.h1}>{t.pwdChangeT}</Title>
      <Muted>{t.pwdChangeSub}</Muted>
    </View>
    <Card style={{ padding: 18, gap: 16 }}>
      <Field variant="branch" label={t.curPass} value={current} onChangeText={setCurrent}
        secureTextEntry={!visible} autoComplete="current-password" autoCapitalize="none" autoCorrect={false}
        editable={!busy} style={{ textAlign: 'left' }} error={showErr && !current ? t.r0 : undefined} />
      <Field variant="branch" label={t.newPass} value={password} onChangeText={setPassword}
        secureTextEntry={!visible} autoComplete="new-password" autoCapitalize="none" autoCorrect={false}
        editable={!busy} style={{ textAlign: 'left' }}
        error={showErr ? !rules[0] ? labels[0] : !rules[1] ? t.r2 : undefined : undefined} />
      <Field variant="branch" label={t.confPass} value={confirmation} onChangeText={setConfirmation}
        secureTextEntry={!visible} autoComplete="new-password" autoCapitalize="none" autoCorrect={false}
        editable={!busy} style={{ textAlign: 'left' }} onSubmitEditing={() => void save()}
        error={showErr && !rules[2] ? t.r3 : undefined} />
      <View style={{ alignSelf: 'flex-start' }}>
        <TextLink label={visible ? t.hidePw : t.showPw} disabled={busy} onPress={() => setVisible(value => !value)} />
      </View>
      <View style={{ paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.line, gap: 8 }}>
        {rules.map((checked, index) => <View key={index} accessible accessibilityRole="checkbox"
          accessibilityState={{ checked }} accessibilityLabel={labels[index]} style={[styles.row, { gap: 10 }]}>
          <View style={{ width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center',
            backgroundColor: checked ? colors.successSoft : colors.surface2 }}>
            <Icon name={checked ? 'check' : 'dash'} size={14} color={checked ? colors.success : colors.muted} />
          </View>
          <Label style={[styles.bold, { flex: 1, fontSize: 14, color: checked ? colors.success : colors.muted }]}>{labels[index]}</Label>
        </View>)}
      </View>
      {error ? <ErrorLine>{errorMessage(error, copy, 'branch')}</ErrorLine> : null}
    </Card>
  </PageFrame>;
}
