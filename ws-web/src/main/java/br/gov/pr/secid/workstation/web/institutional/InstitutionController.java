package br.gov.pr.secid.workstation.web.institutional;

import br.gov.pr.secid.workstation.application.identity.CurrentUser;
import br.gov.pr.secid.workstation.application.institutional.InstitutionPageService;
import br.gov.pr.secid.workstation.application.institutional.InstitutionPageService.CompanyPageView;
import br.gov.pr.secid.workstation.application.institutional.InstitutionPageService.DepartmentPageView;
import br.gov.pr.secid.workstation.application.institutional.InstitutionPageService.DepartmentSummary;
import br.gov.pr.secid.workstation.application.institutional.InstitutionPageService.MyInstitutionView;
import br.gov.pr.secid.workstation.application.institutional.InstitutionPageService.PersonCard;
import br.gov.pr.secid.workstation.application.social.FollowService;
import br.gov.pr.secid.workstation.application.social.FollowService.FollowView;
import br.gov.pr.secid.workstation.web.security.AuthorizedBy;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * RF14/RF15/RF6 — páginas públicas de departamento e empresa e a parte institucional do próprio perfil (auditoria Onda 1, 31/10/2026).
 * Qualquer conta autenticada vê; departamento inexistente, inativo ou ambíguo e empresa inexistente ou inativa respondem o mesmo 404.
 * O slug do departamento só é único dentro da empresa: {@code ?company=} desambigua (sem ele, vale o da empresa de quem vê).
 */
@RestController
@Tag(name = "RF14/RF15 Institucional")
public class InstitutionController {
    private final InstitutionPageService institutions;
    private final FollowService follows;

    public InstitutionController(InstitutionPageService institutions, FollowService follows) {
        this.institutions = institutions;
        this.follows = follows;
    }

    // ------------------------------------------------------------------------------------------------ departamento (RF14)

    @Operation(summary = "RF14.CA01 Cabeçalho do departamento (sigla, nome, cor, monograma, sobre, capa, chefe, empresa, pessoas, seguidores)")
    @GetMapping("/api/departments/{slug}")
    @AuthorizedBy("requireDepartmentVisible")
    public DepartmentPageView department(CurrentUser user, @PathVariable String slug, @RequestParam(required = false) String company) {
        return institutions.department(user, slug, company);
    }

    @Operation(summary = "RF14.CA02 Equipe (modo público): pessoas ativas com lotação vigente, sem contato")
    @GetMapping("/api/departments/{slug}/members")
    @AuthorizedBy("requireDepartmentVisible")
    public List<PersonCard> members(CurrentUser user, @PathVariable String slug, @RequestParam(required = false) String company) {
        return institutions.members(user, slug, company);
    }

    @Operation(summary = "RF14.CA04 Sigo este departamento? Quantos o seguem")
    @GetMapping("/api/departments/{slug}/follow")
    @AuthorizedBy("requireDepartmentVisible")
    public FollowView departmentFollow(CurrentUser user, @PathVariable String slug, @RequestParam(required = false) String company) {
        return follows.departmentStatus(user, slug, company);
    }

    @Operation(summary = "RF14.CA04 Seguir o departamento (idempotente)")
    @PutMapping("/api/departments/{slug}/follow")
    @AuthorizedBy("requireDepartmentVisible")
    public FollowView followDepartment(CurrentUser user, @PathVariable String slug, @RequestParam(required = false) String company) {
        return follows.followDepartment(user, slug, company);
    }

    @Operation(summary = "RF14.CA04 Deixar de seguir o departamento (idempotente)")
    @DeleteMapping("/api/departments/{slug}/follow")
    @AuthorizedBy("requireDepartmentVisible")
    public FollowView unfollowDepartment(CurrentUser user, @PathVariable String slug, @RequestParam(required = false) String company) {
        return follows.unfollowDepartment(user, slug, company);
    }

    // ------------------------------------------------------------------------------------------------ empresa (RF15)

    @Operation(summary = "RF15.CA01 Cabeçalho da empresa (nome, sobre, site, cor, departamentos ativos, pessoas ativas, seguidores)")
    @GetMapping("/api/companies/{slug}")
    @AuthorizedBy("requireCompanyVisible")
    public CompanyPageView company(CurrentUser user, @PathVariable String slug) {
        return institutions.company(user, slug);
    }

    @Operation(summary = "RF15.CA02 Departamentos ativos da empresa")
    @GetMapping("/api/companies/{slug}/departments")
    @AuthorizedBy("requireCompanyVisible")
    public List<DepartmentSummary> departments(CurrentUser user, @PathVariable String slug) {
        return institutions.departmentsOf(user, slug);
    }

    @Operation(summary = "RF15.CA05 Sigo esta empresa? Quantos a seguem")
    @GetMapping("/api/companies/{slug}/follow")
    @AuthorizedBy("requireCompanyVisible")
    public FollowView companyFollow(CurrentUser user, @PathVariable String slug) {
        return follows.companyStatus(user, slug);
    }

    @Operation(summary = "RF15.CA05 Seguir a empresa (idempotente)")
    @PutMapping("/api/companies/{slug}/follow")
    @AuthorizedBy("requireCompanyVisible")
    public FollowView followCompany(CurrentUser user, @PathVariable String slug) {
        return follows.followCompany(user, slug);
    }

    @Operation(summary = "RF15.CA05 Deixar de seguir a empresa (idempotente)")
    @DeleteMapping("/api/companies/{slug}/follow")
    @AuthorizedBy("requireCompanyVisible")
    public FollowView unfollowCompany(CurrentUser user, @PathVariable String slug) {
        return follows.unfollowCompany(user, slug);
    }

    // ------------------------------------------------------------------------------------------------ perfil empresarial (RF6)

    @Operation(summary = "RF6 Parte institucional do meu perfil: empresa (dona ou da lotação) e departamentos ativos")
    @GetMapping("/api/me/institution")
    public MyInstitutionView mine(CurrentUser user) {
        return institutions.mine(user);
    }
}
