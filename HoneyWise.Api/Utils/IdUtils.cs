using System.Security.Cryptography;

namespace HoneyWise.Utils;

public static class IdUtils
{
    public static Guid NewGuid()
    {
        Guid secureId = Guid.Parse(Convert.ToHexString(RandomNumberGenerator.GetBytes(16)));
        return secureId;
    }
}