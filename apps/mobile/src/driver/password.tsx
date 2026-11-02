import { useState } from 'react';
import { View } from 'react-native';
import { changeOwnPassword, passwordRules } from '@/data/auth-api';
import { errorMessage } from '@/data/errors';
import { usePreferences } from '@/providers/preferences';
import { Button, Card, ErrorLine, Field, Icon, Label, TextLink, Title } from '@/ui/components';
import { useDriver } from './state';
import { Footer, Muted, PageFrame, Tile, styles, useDriverFormat } from './shared';

/** Voluntary change stays inside the driver app: /change-password only admits a mandatory change. */
export function PasswordScreen() {
  const data = useDriver(); const { copy } = usePreferences(); const { t, colors } = useDriverFormat();
  const [current, setCurrent] = useState(''); const [password, setPassword] = useState(''); const [confirmation, setConfirmation] = useState('');
  const [visible, setVisible] = useState(false); const [busy, setBusy] = useState(false); const [showErr, setShowErr] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const rules = [...passwordRules(password, confirmation), current.length > 0];
  // Current-password, hide and saved copy is already shared with the branch's voluntary page.
  const labels = [t.rule8, t.ruleNum, t.ruleMatch, copy.branch.r0];
  async function save() {
    if (busy) return;
    if (!rules.every(Boolean)) { setShowErr(true); return; }
    setBusy(true); setError(null);
    try { await changeOwnPassword(current, password); data.showToast(copy.branch.passSaved); data.back(); }
    catch (error) { setError(error); } finally { setBusy(false); }
  }
  return <PageFrame title={t.changePw} onBack={busy ? undefined : data.back} footer={<Footer>
    <Button variant="branch" busy={busy} disabled={busy} label={busy ? copy.branch.saving : t.saveContinue} onPress={() => void save()} style={{ minHeight: 58, borderRadius: 16 }} />
  </Footer>}>
    <Tile icon="key" size={64} radius={20} iconSize={34} color={colors.accent} background={colors.accentSoft} />
    <View style={{ gap: 8 }}><Title style={{ fontSize: 26, lineHeight: 33.8 }}>{t.cpTitle}</Title><Muted style={{ fontSize: 16 }}>{t.cpSubChange}</Muted></View>
    <Field label={copy.branch.curPass} value={current} onChangeText={setCurrent} secureTextEntry={!visible} autoComplete="current-password"
      autoCapitalize="none" autoCorrect={false} editable={!busy} error={showErr && !current ? copy.branch.r0 : undefined} />
    <Field label={t.newPw} value={password} onChangeText={setPassword} secureTextEntry={!visible} autoComplete="new-password"
      autoCapitalize="none" autoCorrect={false} editable={!busy} error={showErr && (!rules[0] || !rules[1]) ? !rules[0] ? t.rule8 : t.ruleNum : undefined} />
    <Field label={t.confirmPw} value={confirmation} onChangeText={setConfirmation} secureTextEntry={!visible} autoComplete="new-password"
      autoCapitalize="none" autoCorrect={false} editable={!busy} onSubmitEditing={() => void save()} error={showErr && !rules[2] ? t.ruleMatch : undefined} />
    <TextLink label={visible ? copy.branch.hidePw : t.showPw} disabled={busy} onPress={() => setVisible(v => !v)} />
    <Card style={{ padding: 16, borderRadius: 18, gap: 12 }}>{rules.map((checked, i) => <View key={i} accessible accessibilityRole="checkbox"
      accessibilityState={{ checked }} accessibilityLabel={labels[i]} style={[styles.row, { gap: 10 }]}>
      <Icon name={checked ? 'check' : 'dash'} size={22} color={checked ? colors.success : colors.muted} />
      <Label style={[styles.bold, styles.grow, { color: checked ? colors.success : colors.muted }]}>{labels[i]}</Label></View>)}</Card>
    {error ? <ErrorLine>{errorMessage(error, copy, 'driver')}</ErrorLine> : null}
  </PageFrame>;
}
