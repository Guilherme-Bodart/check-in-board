package com.checkinboard.backend.modules.icalsources.service;

import java.net.Inet4Address;
import java.net.Inet6Address;
import java.net.InetAddress;
import java.net.URI;
import java.net.URISyntaxException;
import java.util.Locale;
import org.springframework.stereotype.Component;

@Component
public class IcalUrlPolicy {

    public URI assertSafe(String rawUrl) {
        URI uri = parse(rawUrl.trim());
        String scheme = uri.getScheme();

        if (!"http".equalsIgnoreCase(scheme) && !"https".equalsIgnoreCase(scheme)) {
            throw unsafe("Only HTTP and HTTPS iCal URLs are allowed.");
        }

        if (uri.getUserInfo() != null) {
            throw unsafe("Credentials in iCal URLs are not allowed.");
        }

        String host = uri.getHost();

        if (host == null || host.isBlank()) {
            throw unsafe("Invalid iCal URL.");
        }

        if (isBlockedHostname(host)) {
            throw unsafe("Local iCal URLs are not allowed.");
        }

        try {
            for (InetAddress address : InetAddress.getAllByName(host)) {
                if (isPrivateAddress(address)) {
                    throw unsafe("Private network iCal URLs are not allowed.");
                }
            }
        } catch (IcalUrlPolicyException exception) {
            throw exception;
        } catch (SecurityException exception) {
            throw unsafe("Private network iCal URLs are not allowed.");
        } catch (Exception exception) {
            throw unsafe("Invalid iCal URL.");
        }

        return uri;
    }

    private URI parse(String rawUrl) {
        try {
            return new URI(rawUrl);
        } catch (URISyntaxException exception) {
            throw unsafe("Invalid iCal URL.");
        }
    }

    private boolean isBlockedHostname(String host) {
        String normalizedHost = host.toLowerCase(Locale.ROOT);
        return (
            normalizedHost.equals("localhost") ||
            normalizedHost.endsWith(".localhost") ||
            normalizedHost.endsWith(".local")
        );
    }

    private boolean isPrivateAddress(InetAddress address) {
        if (
            address.isAnyLocalAddress() ||
            address.isLoopbackAddress() ||
            address.isLinkLocalAddress() ||
            address.isSiteLocalAddress()
        ) {
            return true;
        }

        if (address instanceof Inet4Address) {
            byte[] bytes = address.getAddress();
            int first = bytes[0] & 0xff;
            int second = bytes[1] & 0xff;
            return first == 0 || (first == 169 && second == 254);
        }

        if (address instanceof Inet6Address) {
            byte[] bytes = address.getAddress();
            int first = bytes[0] & 0xff;
            return first == 0xfc || first == 0xfd;
        }

        return false;
    }

    private IcalUrlPolicyException unsafe(String message) {
        return new IcalUrlPolicyException(message);
    }
}
