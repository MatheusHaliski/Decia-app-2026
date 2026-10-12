package br.gov.pr.secid.workstation.domain.identity;

import java.math.BigDecimal;
import java.util.UUID;

/** Preferências 1:1 com a conta (TAXONOMIA §1.2, tabela {@code user_preferences}); padrões iguais aos do V2. */
public class UserPreferences {
    private UUID userId;
    private long version;
    private String theme = "AUTO";
    private String language = "PT_BR";
    private String density = "NORMAL";
    private BigDecimal fontScale = BigDecimal.ONE;
    private boolean reduceMotion;
    private String deskSkin = "PAPEL";
    private String defaultCardSkin;
    private String notificationPrefsJson;
    private String timezone = "America/Sao_Paulo";
    private int wipLimit = 3;
    private String dashboardLayoutJson;
    private String aiModeDefault = "ECONOMIA";

    public UUID getUserId() {
        return userId;
    }

    public void setUserId(UUID userId) {
        this.userId = userId;
    }

    public long getVersion() {
        return version;
    }

    public void setVersion(long version) {
        this.version = version;
    }

    public String getTheme() {
        return theme;
    }

    public void setTheme(String theme) {
        this.theme = theme;
    }

    public String getLanguage() {
        return language;
    }

    public void setLanguage(String language) {
        this.language = language;
    }

    public String getDensity() {
        return density;
    }

    public void setDensity(String density) {
        this.density = density;
    }

    public BigDecimal getFontScale() {
        return fontScale;
    }

    public void setFontScale(BigDecimal fontScale) {
        this.fontScale = fontScale;
    }

    public boolean isReduceMotion() {
        return reduceMotion;
    }

    public void setReduceMotion(boolean reduceMotion) {
        this.reduceMotion = reduceMotion;
    }

    public String getDeskSkin() {
        return deskSkin;
    }

    public void setDeskSkin(String deskSkin) {
        this.deskSkin = deskSkin;
    }

    public String getDefaultCardSkin() {
        return defaultCardSkin;
    }

    public void setDefaultCardSkin(String defaultCardSkin) {
        this.defaultCardSkin = defaultCardSkin;
    }

    public String getNotificationPrefsJson() {
        return notificationPrefsJson;
    }

    public void setNotificationPrefsJson(String notificationPrefsJson) {
        this.notificationPrefsJson = notificationPrefsJson;
    }

    public String getTimezone() {
        return timezone;
    }

    public void setTimezone(String timezone) {
        this.timezone = timezone;
    }

    public int getWipLimit() {
        return wipLimit;
    }

    public void setWipLimit(int wipLimit) {
        this.wipLimit = wipLimit;
    }

    public String getDashboardLayoutJson() {
        return dashboardLayoutJson;
    }

    public void setDashboardLayoutJson(String dashboardLayoutJson) {
        this.dashboardLayoutJson = dashboardLayoutJson;
    }

    public String getAiModeDefault() {
        return aiModeDefault;
    }

    public void setAiModeDefault(String aiModeDefault) {
        this.aiModeDefault = aiModeDefault;
    }
}
