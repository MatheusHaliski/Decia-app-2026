package br.gov.pr.secid.workstation.infrastructure.mysql.identity;

import br.gov.pr.secid.workstation.domain.identity.UserPreferences;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

/** Linha de {@code user_preferences} (V2), 1:1 com {@code users}. */
@Entity
@Table(name = "user_preferences")
public class UserPreferencesEntity {

    @Id
    @Column(name = "user_id", columnDefinition = "BINARY(16)", nullable = false, updatable = false)
    private UUID userId;

    @Version
    @Column(name = "version", nullable = false)
    private long version;

    @Column(name = "theme", nullable = false, length = 20)
    private String theme;

    @Column(name = "language", nullable = false, length = 10)
    private String language;

    @Column(name = "density", nullable = false, length = 20)
    private String density;

    @Column(name = "font_scale", nullable = false, precision = 3, scale = 2)
    private BigDecimal fontScale;

    @Column(name = "reduce_motion", nullable = false)
    private boolean reduceMotion;

    @Column(name = "desk_skin", nullable = false, length = 20)
    private String deskSkin;

    @Column(name = "default_card_skin", length = 40)
    private String defaultCardSkin;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "notification_prefs_json")
    private String notificationPrefsJson;

    @Column(name = "timezone", nullable = false, length = 64)
    private String timezone;

    @Column(name = "wip_limit", nullable = false)
    private int wipLimit;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "dashboard_layout_json")
    private String dashboardLayoutJson;

    @Column(name = "ai_mode_default", nullable = false, length = 20)
    private String aiModeDefault;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    protected UserPreferencesEntity() {
    }

    static UserPreferencesEntity fromDomain(UserPreferences p) {
        UserPreferencesEntity e = new UserPreferencesEntity();
        e.userId = p.getUserId();
        e.createdAt = Instant.now();
        e.apply(p);
        return e;
    }

    void apply(UserPreferences p) {
        theme = p.getTheme();
        language = p.getLanguage();
        density = p.getDensity();
        fontScale = p.getFontScale();
        reduceMotion = p.isReduceMotion();
        deskSkin = p.getDeskSkin();
        defaultCardSkin = p.getDefaultCardSkin();
        notificationPrefsJson = p.getNotificationPrefsJson();
        timezone = p.getTimezone();
        wipLimit = p.getWipLimit();
        dashboardLayoutJson = p.getDashboardLayoutJson();
        aiModeDefault = p.getAiModeDefault();
        updatedAt = Instant.now();
    }

    UserPreferences toDomain() {
        UserPreferences p = new UserPreferences();
        p.setUserId(userId);
        p.setVersion(version);
        p.setTheme(theme);
        p.setLanguage(language);
        p.setDensity(density);
        p.setFontScale(fontScale);
        p.setReduceMotion(reduceMotion);
        p.setDeskSkin(deskSkin);
        p.setDefaultCardSkin(defaultCardSkin);
        p.setNotificationPrefsJson(notificationPrefsJson);
        p.setTimezone(timezone);
        p.setWipLimit(wipLimit);
        p.setDashboardLayoutJson(dashboardLayoutJson);
        p.setAiModeDefault(aiModeDefault);
        return p;
    }
}
