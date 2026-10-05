package br.gov.pr.secid.workstation.web.support;

import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;

import static org.assertj.core.api.Assertions.assertThat;

class RequestPathsTest {

    @Test
    void normalizaBarrasPontoEVirgulaMaiusculasEBarraFinal() {
        assertThat(RequestPaths.normalize("/api//auth/LOGIN/")).isEqualTo("/api/auth/login");
        assertThat(RequestPaths.normalize("/api/auth/login;jsessionid=1")).isEqualTo("/api/auth/login");
        assertThat(RequestPaths.normalize("\\api\\auth")).isEqualTo("/api/auth");
        assertThat(RequestPaths.normalize(null)).isEmpty();
        assertThat(RequestPaths.normalize("/")).isEqualTo("/");
    }

    @Test
    void semServletPathDecodificaAUri() {
        MockHttpServletRequest r = new MockHttpServletRequest("POST", "/api/auth/%6Cogin");
        assertThat(RequestPaths.normalized(r)).isEqualTo("/api/auth/login");
        MockHttpServletRequest s = new MockHttpServletRequest("POST", "/x");
        s.setServletPath("/api/auth");
        s.setPathInfo("/login/");
        assertThat(RequestPaths.normalized(s)).isEqualTo("/api/auth/login");
    }
}
