import PropTypes from 'prop-types';
import React, { PureComponent } from 'react';
import {
  Alert,
  StyleSheet,
  Switch,
  Text,
  ScrollView,
  View,
  ActivityIndicator,
  Keyboard,
  InteractionManager,
  Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { connect } from 'react-redux';
import { MAINNET } from '../../../../constants/network';
import ActionModal from '../../../UI/ActionModal';
import SelectComponent from '../../../UI/SelectComponent';
import StyledButton from '../../../UI/StyledButton';
import { clearHistory } from '../../../../actions/browser';
import { setThirdPartyApiMode } from '../../../../actions/privacy';
import {
  fontStyles,
  colors as importedColors,
} from '../../../../styles/common';
import Logger from '../../../../util/Logger';
import { getNavigationOptionsTitle } from '../../../UI/Navbar';
import { setLockTime } from '../../../../actions/settings';
import { strings } from '../../../../../locales/i18n';
import Analytics from '../../../../core/Analytics/Analytics';
import { passwordSet } from '../../../../actions/user';
import Engine from '../../../../core/Engine';
import AppConstants from '../../../../core/AppConstants';
import {
  EXISTING_USER,
  TRUE,
  PASSCODE_DISABLED,
  BIOMETRY_CHOICE_DISABLED,
  SEED_PHRASE_HINTS,
} from '../../../../constants/storage';
import HintModal from '../../../UI/HintModal';
import { MetaMetricsEvents } from '../../../../core/Analytics';
import AnalyticsV2, {
  trackErrorAsAnalytics,
} from '../../../../util/analyticsV2';
import { Authentication } from '../../../../core';
import AUTHENTICATION_TYPE from '../../../../constants/userProperties';
import { useTheme, ThemeContext, mockTheme } from '../../../../util/theme';
import {
  ClearCookiesSection,
  DeleteMetaMetricsData,
  DeleteWalletData,
  RememberMeOptionSection,
  AutomaticSecurityChecks,
  ProtectYourWallet,
  LoginOptionsSettings,
  RevealPrivateKey,
  ChangePassword,
} from './Sections';
import Routes from '../../../../constants/navigation/Routes';
import { selectProviderType } from '../../../../selectors/networkController';
import { SECURITY_PRIVACY_VIEW_ID } from '../../../../../wdio/screen-objects/testIDs/Screens/SecurityPrivacy.testIds';
import generateTestId from '../../../../../wdio/utils/generateTestId';

const createStyles = (colors) =>
  StyleSheet.create({
    wrapper: {
      backgroundColor: colors.background.default,
      flex: 1,
      padding: 24,
      paddingBottom: 48,
    },
    title: {
      ...fontStyles.normal,
      color: colors.text.default,
      fontSize: 20,
      lineHeight: 20,
      paddingTop: 4,
      marginTop: -4,
    },
    heading: {
      fontSize: 24,
      lineHeight: 30,
      marginBottom: 24,
    },
    desc: {
      ...fontStyles.normal,
      color: colors.text.alternative,
      fontSize: 14,
      lineHeight: 20,
      marginTop: 12,
    },
    switchElement: {
      marginTop: 18,
      alignSelf: 'flex-start',
    },
    setting: {
      marginTop: 50,
    },
    firstSetting: {
      marginTop: 0,
    },
    modalView: {
      alignItems: 'center',
      flex: 1,
      flexDirection: 'column',
      justifyContent: 'center',
      padding: 20,
    },
    modalText: {
      ...fontStyles.normal,
      fontSize: 18,
      textAlign: 'center',
      color: colors.text.default,
    },
    modalTitle: {
      ...fontStyles.bold,
      fontSize: 22,
      textAlign: 'center',
      marginBottom: 20,
      color: colors.text.default,
    },
    confirm: {
      marginTop: 18,
    },
    protect: {
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    col: {
      width: '48%',
    },
    inner: {
      paddingBottom: 112,
    },
    picker: {
      borderColor: colors.border.default,
      borderRadius: 5,
      borderWidth: 2,
      marginTop: 16,
    },
    loader: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    switch: {
      alignSelf: 'flex-start',
    },
  });

const Heading = ({ children, first }) => {
  const { colors } = useTheme();
  const styles = createStyles(colors);

  return (
    <View style={[styles.setting, first && styles.firstSetting]}>
      <Text style={[styles.title, styles.heading]}>{children}</Text>
    </View>
  );
};

Heading.propTypes = {
  children: PropTypes.oneOfType([
    PropTypes.arrayOf(PropTypes.node),
    PropTypes.node,
  ]),
  first: PropTypes.bool,
};

const PASSCODE_CHOICE_STRING = 'passcodeChoice';
const BIOMETRY_CHOICE_STRING = 'biometryChoice';

/**
 * Main view for app configurations
 */
class Settings extends PureComponent {
  static propTypes = {
    /**
     * Called to toggle set party api mode
     */
    setThirdPartyApiMode: PropTypes.func,
    /**
     * Indicates whether third party API mode is enabled
     */
    thirdPartyApiMode: PropTypes.bool,
    /**
     * Called to set the passwordSet flag
     */
    passwordSet: PropTypes.func,
    /**
    /* navigation object required to push new views
    */
    navigation: PropTypes.object,
    /**
     * Array of visited websites
     */
    browserHistory: PropTypes.array,
    /**
     * Called to clear the list of visited urls
     */
    clearBrowserHistory: PropTypes.func,
    /**
     * Called to set the active search engine
     */
    setLockTime: PropTypes.func,
    /**
     * Active search engine
     */
    lockTime: PropTypes.number,
    /**
     * Selected address as string
     */
    selectedAddress: PropTypes.string,
    /**
     * List of accounts from the AccountTrackerController
     */
    accounts: PropTypes.object,
    /**
     * List of accounts from the PreferencesController
     */
    identities: PropTypes.object,
    /**
     * redux flag that indicates if the user
     * completed the seed phrase backup flow
     */
    seedphraseBackedUp: PropTypes.bool,
    /**
     * State of OpenSea Enable toggle
     */
    openSeaEnabled: PropTypes.bool,
    /**
     * State of NFT detection toggle
     */
    useNftDetection: PropTypes.bool,
    /**
     * Route passed in props from navigation
     */
    route: PropTypes.object,
    /**
     * Type of network
     */
    type: PropTypes.string,
  };

  state = {
    approvalModalVisible: false,
    browserHistoryModalVisible: false,
    analyticsEnabled: false,
    showHint: false,
    hintText: '',
  };

  autolockOptions = [
    {
      value: '0',
      label: strings('app_settings.autolock_immediately'),
      key: '0',
    },
    {
      value: '5000',
      label: strings('app_settings.autolock_after', { time: 5 }),
      key: '5000',
    },
    {
      value: '15000',
      label: strings('app_settings.autolock_after', { time: 15 }),
      key: '15000',
    },
    {
      value: '30000',
      label: strings('app_settings.autolock_after', { time: 30 }),
      key: '30000',
    },
    {
      value: '60000',
      label: strings('app_settings.autolock_after', { time: 60 }),
      key: '60000',
    },
    {
      value: '300000',
      label: strings('app_settings.autolock_after_minutes', { time: 5 }),
      key: '300000',
    },
    {
      value: '600000',
      label: strings('app_settings.autolock_after_minutes', { time: 10 }),
      key: '600000',
    },
    {
      value: '-1',
      label: strings('app_settings.autolock_never'),
      key: '-1',
    },
  ];

  scrollView = undefined;

  updateNavBar = () => {
    const { navigation } = this.props;
    const colors = this.context.colors || mockTheme.colors;
    navigation.setOptions(
      getNavigationOptionsTitle(
        strings('app_settings.security_title'),
        navigation,
        false,
        colors,
      ),
    );
  };

  componentDidMount = async () => {
    this.updateNavBar();
    AnalyticsV2.trackEvent(MetaMetricsEvents.VIEW_SECURITY_SETTINGS);
    const analyticsEnabled = Analytics.checkEnabled();
    const currentSeedphraseHints = await AsyncStorage.getItem(
      SEED_PHRASE_HINTS,
    );
    const parsedHints =
      currentSeedphraseHints && JSON.parse(currentSeedphraseHints);
    const manualBackup = parsedHints?.manualBackup;
    this.setState({
      analyticsEnabled,
      hintText: manualBackup,
    });

    if (this.props.route?.params?.scrollToBottom)
      this.scrollView?.scrollToEnd({ animated: true });
  };

  componentDidUpdate = async () => {
    this.updateNavBar();
  };

  setPassword = async (enabled, passwordType) => {
    this.setState({ loading: true }, async () => {
      let credentials;
      try {
        credentials = await Authentication.getPassword();
      } catch (error) {
        Logger.error(error);
      }

      if (credentials && credentials.password !== '') {
        this.storeCredentials(credentials.password, enabled, passwordType);
      } else {
        this.props.navigation.navigate('EnterPasswordSimple', {
          onPasswordSet: (password) => {
            this.storeCredentials(password, enabled, passwordType);
          },
        });
      }
    });
  };

  isMainnet = () => this.props.type === MAINNET;

  onSignInWithPasscode = async (enabled) => {
    await this.setPassword(enabled, PASSCODE_CHOICE_STRING);
  };

  onSingInWithBiometrics = async (enabled) => {
    await this.setPassword(enabled, BIOMETRY_CHOICE_STRING);
  };

  storeCredentials = async (password, enabled, type) => {
    try {
      await Authentication.resetPassword();

      await Engine.context.KeyringController.exportSeedPhrase(password);

      await AsyncStorage.setItem(EXISTING_USER, TRUE);

      if (!enabled) {
        this.setState({ [type]: false, loading: false });
        if (type === PASSCODE_CHOICE_STRING) {
          await AsyncStorage.setItem(PASSCODE_DISABLED, TRUE);
        } else if (type === BIOMETRY_CHOICE_STRING) {
          await AsyncStorage.setItem(BIOMETRY_CHOICE_DISABLED, TRUE);
          await AsyncStorage.setItem(PASSCODE_DISABLED, TRUE);
        }

        return;
      }

      try {
        let authType;
        if (type === BIOMETRY_CHOICE_STRING) {
          authType = AUTHENTICATION_TYPE.BIOMETRIC;
        } else if (type === PASSCODE_CHOICE_STRING) {
          authType = AUTHENTICATION_TYPE.PASSCODE;
        } else {
          authType = AUTHENTICATION_TYPE.PASSWORD;
        }
        await Authentication.storePassword(password, authType);
      } catch (error) {
        Logger.error(error);
      }

      this.props.passwordSet();

      if (this.props.lockTime === -1) {
        this.props.setLockTime(AppConstants.DEFAULT_LOCK_TIMEOUT);
      }

      this.setState({ [type]: true, loading: false });
    } catch (e) {
      if (e.message === 'Invalid password') {
        Alert.alert(
          strings('app_settings.invalid_password'),
          strings('app_settings.invalid_password_message'),
        );
        trackErrorAsAnalytics('SecuritySettings: Invalid password', e?.message);
      } else {
        Logger.error(e, 'SecuritySettings:biometrics');
      }
      this.setState({ [type]: !enabled, loading: false });
    }
  };

  toggleClearApprovalsModal = () => {
    this.setState({ approvalModalVisible: !this.state.approvalModalVisible });
  };

  toggleClearBrowserHistoryModal = () => {
    this.setState({
      browserHistoryModalVisible: !this.state.browserHistoryModalVisible,
    });
  };

  clearApprovals = () => {
    const { PermissionController } = Engine.context;
    PermissionController?.clearState?.();
    this.toggleClearApprovalsModal();
  };

  clearBrowserHistory = () => {
    this.props.clearBrowserHistory();
    this.toggleClearBrowserHistoryModal();
  };

  toggleThirdPartyAPI = (value) => {
    this.props.setThirdPartyApiMode(value);
  };

  toggleOpenSeaApi = (value) => {
    const { PreferencesController } = Engine.context;
    PreferencesController?.setOpenSeaEnabled(value);
    if (!value) PreferencesController?.setUseNftDetection(value);
  };

  toggleNftAutodetect = (value) => {
    const { PreferencesController } = Engine.context;
    PreferencesController.setUseNftDetection(value);
  };

  /**
   * Track the event of opt in or opt out.
   * @param AnalyticsOptionSelected - User selected option regarding the tracking of events
   */
  trackOptInEvent = (AnalyticsOptionSelected) => {
    InteractionManager.runAfterInteractions(async () => {
      AnalyticsV2.trackEvent(MetaMetricsEvents.ANALYTICS_PREFERENCE_SELECTED, {
        analytics_option_selected: AnalyticsOptionSelected,
        updated_after_onboarding: true,
      });
    });
  };

  toggleMetricsOptIn = async (value) => {
    if (value) {
      Analytics.enable();
      this.setState({ analyticsEnabled: true });
      await this.trackOptInEvent('Metrics Opt In');
    } else {
      await this.trackOptInEvent('Metrics Opt Out');
      Analytics.disable();
      this.setState({ analyticsEnabled: false });
      Alert.alert(
        strings('app_settings.metametrics_opt_out'),
        strings('app_settings.metametrics_restart_required'),
      );
    }
  };

  selectLockTime = (lockTime) => {
    this.props.setLockTime(parseInt(lockTime, 10));
  };

  saveHint = async () => {
    const { hintText } = this.state;
    if (!hintText) return;
    this.toggleHint();
    const currentSeedphraseHints = await AsyncStorage.getItem(
      SEED_PHRASE_HINTS,
    );
    const parsedHints = JSON.parse(currentSeedphraseHints);
    await AsyncStorage.setItem(
      SEED_PHRASE_HINTS,
      JSON.stringify({ ...parsedHints, manualBackup: hintText }),
    );
  };

  toggleHint = () => {
    this.setState((state) => ({ showHint: !state.showHint }));
  };

  handleChangeText = (text) => this.setState({ hintText: text });

  getStyles = () => {
    const colors = this.context.colors || mockTheme.colors;
    return { colors, styles: createStyles(colors) };
  };

  renderHint = () => {
    const { showHint, hintText } = this.state;
    return (
      <HintModal
        onConfirm={this.saveHint}
        onCancel={this.toggleHint}
        modalVisible={showHint}
        onRequestClose={Keyboard.dismiss}
        value={hintText}
        onChangeText={this.handleChangeText}
      />
    );
  };

  renderAutoLockSection = () => {
    const { styles } = this.getStyles();
    return (
      <View style={styles.setting} testID={'auto-lock-section'}>
        <Text style={styles.title}>{strings('app_settings.auto_lock')}</Text>
        <Text style={styles.desc}>
          {strings('app_settings.auto_lock_desc')}
        </Text>
        <View style={styles.picker}>
          {this.autolockOptions && (
            <SelectComponent
              selectedValue={this.props.lockTime.toString()}
              onValueChange={this.selectLockTime}
              label={strings('app_settings.auto_lock')}
              options={this.autolockOptions}
            />
          )}
        </View>
      </View>
    );
  };

  renderClearPrivacySection = () => {
    const { styles } = this.getStyles();

    return (
      <View style={[styles.setting]} testID={'clear-privacy-section'}>
        <Text style={styles.title}>
          {strings('app_settings.clear_privacy_title')}
        </Text>
        <Text style={styles.desc}>
          {strings('app_settings.clear_privacy_desc')}
        </Text>
        <StyledButton
          type="normal"
          onPress={this.toggleClearApprovalsModal}
          containerStyle={styles.confirm}
        >
          {strings('app_settings.clear_privacy_title')}
        </StyledButton>
      </View>
    );
  };

  renderClearBrowserHistorySection = () => {
    const { browserHistory } = this.props;
    const { styles } = this.getStyles();

    return (
      <View style={styles.setting}>
        <Text style={styles.title}>
          {strings('app_settings.clear_browser_history_desc')}
        </Text>
        <Text style={styles.desc}>
          {strings('app_settings.clear_history_desc')}
        </Text>
        <StyledButton
          type="normal"
          onPress={this.toggleClearBrowserHistoryModal}
          disabled={browserHistory.length === 0}
          containerStyle={styles.confirm}
        >
          {strings('app_settings.clear_browser_history_desc')}
        </StyledButton>
      </View>
    );
  };

  renderMetaMetricsSection = () => {
    const { analyticsEnabled } = this.state;
    const { styles, colors } = this.getStyles();

    return (
      <View style={styles.setting} testID={'metametrics-section'}>
        <Text style={styles.title}>
          {strings('app_settings.metametrics_title')}
        </Text>
        <Text style={styles.desc}>
          {strings('app_settings.metametrics_description')}
        </Text>
        <View style={styles.switchElement}>
          <Switch
            value={analyticsEnabled}
            onValueChange={this.toggleMetricsOptIn}
            trackColor={{
              true: colors.primary.default,
              false: colors.border.muted,
            }}
            thumbColor={importedColors.white}
            style={styles.switch}
            ios_backgroundColor={colors.border.muted}
            testID={'metametrics-switch'}
          />
        </View>
      </View>
    );
  };

  renderThirdPartySection = () => {
    const { thirdPartyApiMode } = this.props;
    const { styles, colors } = this.getStyles();

    return (
      <View style={styles.setting} testID={'third-party-section'}>
        <Text style={styles.title}>
          {strings('app_settings.third_party_title')}
        </Text>
        <Text style={styles.desc}>
          {strings('app_settings.third_party_description')}
        </Text>
        <View style={styles.switchElement}>
          <Switch
            value={thirdPartyApiMode}
            onValueChange={this.toggleThirdPartyAPI}
            trackColor={{
              true: colors.primary.default,
              false: colors.border.muted,
            }}
            thumbColor={importedColors.white}
            style={styles.switch}
            ios_backgroundColor={colors.border.muted}
          />
        </View>
      </View>
    );
  };

  goToSDKSessionManager = () => {
    this.props.navigation.navigate('SDKSessionsManager');
  };

  renderApprovalModal = () => {
    const { approvalModalVisible } = this.state;
    const { styles } = this.getStyles();

    return (
      <ActionModal
        modalVisible={approvalModalVisible}
        confirmText={strings('app_settings.clear')}
        cancelText={strings('app_settings.reset_account_cancel_button')}
        onCancelPress={this.toggleClearApprovalsModal}
        onRequestClose={this.toggleClearApprovalsModal}
        onConfirmPress={this.clearApprovals}
      >
        <View style={styles.modalView}>
          <Text style={styles.modalTitle}>
            {strings('app_settings.clear_approvals_modal_title')}
          </Text>
          <Text style={styles.modalText}>
            {strings('app_settings.clear_approvals_modal_message')}
          </Text>
        </View>
      </ActionModal>
    );
  };

  renderHistoryModal = () => {
    const { browserHistoryModalVisible } = this.state;
    const { styles } = this.getStyles();

    return (
      <ActionModal
        modalVisible={browserHistoryModalVisible}
        confirmText={strings('app_settings.clear')}
        cancelText={strings('app_settings.reset_account_cancel_button')}
        onCancelPress={this.toggleClearBrowserHistoryModal}
        onRequestClose={this.toggleClearBrowserHistoryModal}
        onConfirmPress={this.clearBrowserHistory}
      >
        <View style={styles.modalView}>
          <Text style={styles.modalTitle}>
            {strings('app_settings.clear_browser_history_modal_title')}
          </Text>
          <Text style={styles.modalText}>
            {strings('app_settings.clear_browser_history_modal_message')}
          </Text>
        </View>
      </ActionModal>
    );
  };

  renderSDKSettings = () => {
    const { styles } = this.getStyles();

    return (
      <View
        style={[styles.setting, styles.firstSetting]}
        testID={'sdk-section'}
      >
        <Text style={styles.title}>
          {strings('app_settings.manage_sdk_connections_title')}
        </Text>
        <Text style={styles.desc}>
          {strings('app_settings.manage_sdk_connections_text')}
        </Text>
        <StyledButton
          type="normal"
          containerStyle={styles.confirm}
          onPress={this.goToSDKSessionManager}
        >
          {strings('app_settings.manage_sdk_connections_title')}
        </StyledButton>
      </View>
    );
  };

  renderOpenSeaSettings = () => {
    const { openSeaEnabled, useNftDetection } = this.props;
    const { styles, colors } = this.getStyles();

    return (
      <>
        <View style={styles.setting} testID={'nft-opensea-mode-section'}>
          <Text style={styles.title}>
            {strings('app_settings.nft_opensea_mode')}
          </Text>
          <Text style={styles.desc}>
            {strings('app_settings.nft_opensea_desc')}
          </Text>
          <View style={styles.switchElement}>
            <Switch
              value={openSeaEnabled}
              onValueChange={this.toggleOpenSeaApi}
              trackColor={{
                true: colors.primary.default,
                false: colors.border.muted,
              }}
              thumbColor={importedColors.white}
              style={styles.switch}
              ios_backgroundColor={colors.border.muted}
            />
          </View>
        </View>
        <View
          style={styles.setting}
          testID={'nft-opensea-autodetect-mode-section'}
        >
          <Text style={styles.title}>
            {strings('app_settings.nft_autodetect_mode')}
          </Text>
          <Text style={styles.desc}>
            {strings('app_settings.nft_autodetect_desc')}
          </Text>
          <View style={styles.switchElement}>
            <Switch
              value={useNftDetection}
              onValueChange={this.toggleNftAutodetect}
              trackColor={{
                true: colors.primary.default,
                false: colors.border.muted,
              }}
              thumbColor={importedColors.white}
              style={styles.switch}
              ios_backgroundColor={colors.border.muted}
              disabled={!openSeaEnabled}
            />
          </View>
        </View>
      </>
    );
  };

  openSRPQuiz = () => {
    const { navigation } = this.props;
    navigation.navigate(Routes.MODAL.ROOT_MODAL_FLOW, {
      screen: Routes.MODAL.SRP_REVEAL_QUIZ,
    });
  };

  render = () => {
    const { hintText, loading } = this.state;
    const { seedphraseBackedUp } = this.props;
    const { styles } = this.getStyles();

    if (loading)
      return (
        <View style={styles.loader}>
          <ActivityIndicator size="large" />
        </View>
      );

    return (
      <ScrollView
        style={styles.wrapper}
        testID={SECURITY_PRIVACY_VIEW_ID}
        {...generateTestId(Platform, SECURITY_PRIVACY_VIEW_ID)}
        ref={(view) => {
          this.scrollView = view;
        }}
      >
        <View style={styles.inner}>
          <Heading first>{strings('app_settings.security_heading')}</Heading>
          <ProtectYourWallet
            srpBackedup={seedphraseBackedUp}
            hintText={hintText}
            toggleHint={this.toggleHint}
          />
          <ChangePassword />
          {this.renderAutoLockSection()}
          <LoginOptionsSettings
            onSignWithBiometricsOptionUpdated={this.onSingInWithBiometrics}
            onSignWithPasscodeOptionUpdated={this.onSignInWithPasscode}
          />
          <RememberMeOptionSection />
          <RevealPrivateKey />
          <Heading>{strings('app_settings.privacy_heading')}</Heading>
          {this.renderSDKSettings()}
          {this.renderClearPrivacySection()}
          {this.renderClearBrowserHistorySection()}
          <ClearCookiesSection />
          {this.renderMetaMetricsSection()}
          <DeleteMetaMetricsData />
          <DeleteWalletData />
          {this.renderThirdPartySection()}
          {this.renderApprovalModal()}
          {this.renderHistoryModal()}
          {this.isMainnet() && this.renderOpenSeaSettings()}
          <AutomaticSecurityChecks />
          {this.renderHint()}
        </View>
      </ScrollView>
    );
  };
}

Settings.contextType = ThemeContext;

const mapStateToProps = (state) => ({
  browserHistory: state.browser.history,
  lockTime: state.settings.lockTime,
  thirdPartyApiMode: state.privacy.thirdPartyApiMode,
  selectedAddress:
    state.engine.backgroundState.PreferencesController.selectedAddress,
  accounts: state.engine.backgroundState.AccountTrackerController.accounts,
  identities: state.engine.backgroundState.PreferencesController.identities,
  keyrings: state.engine.backgroundState.KeyringController.keyrings,
  openSeaEnabled:
    state.engine.backgroundState.PreferencesController.openSeaEnabled,
  useNftDetection:
    state.engine.backgroundState.PreferencesController.useNftDetection,
  passwordHasBeenSet: state.user.passwordSet,
  seedphraseBackedUp: state.user.seedphraseBackedUp,
  type: selectProviderType(state),
});

const mapDispatchToProps = (dispatch) => ({
  clearBrowserHistory: () => dispatch(clearHistory()),
  setLockTime: (lockTime) => dispatch(setLockTime(lockTime)),
  setThirdPartyApiMode: (enabled) => dispatch(setThirdPartyApiMode(enabled)),
  passwordSet: () => dispatch(passwordSet()),
});

export default connect(mapStateToProps, mapDispatchToProps)(Settings);
