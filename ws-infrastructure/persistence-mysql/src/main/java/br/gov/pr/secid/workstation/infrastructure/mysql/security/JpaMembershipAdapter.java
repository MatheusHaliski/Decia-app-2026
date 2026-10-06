package br.gov.pr.secid.workstation.infrastructure.mysql.security;

import br.gov.pr.secid.workstation.application.security.MembershipPort;
import br.gov.pr.secid.workstation.domain.institutional.DeptRole;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.EnumMap;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/** {@link MembershipPort} sobre {@code department_memberships}: vários vínculos no mesmo departamento ficam com o papel mais forte. */
@Component
public class JpaMembershipAdapter implements MembershipPort {
    private static final Map<DeptRole, Integer> STRENGTH = new EnumMap<>(Map.of(DeptRole.MEMBRO, 0, DeptRole.CURADOR, 1, DeptRole.CHEFE, 2));
    private final ActiveMembershipQueries queries;

    public JpaMembershipAdapter(ActiveMembershipQueries queries) {
        this.queries = queries;
    }

    @Override
    @Transactional(readOnly = true)
    public Map<UUID, DeptRole> activeRoles(UUID userId) {
        return merge(queries.activeRoles(userId));
    }

    static Map<UUID, DeptRole> merge(List<Object[]> rows) {
        Map<UUID, DeptRole> out = new HashMap<>();
        for (Object[] r : rows) {
            if (r.length < 2 || !(r[0] instanceof UUID dept) || !(r[1] instanceof DeptRole role)) {
                continue;
            }
            out.merge(dept, role, (a, b) -> STRENGTH.get(a) >= STRENGTH.get(b) ? a : b);
        }
        return Map.copyOf(out);
    }
}
